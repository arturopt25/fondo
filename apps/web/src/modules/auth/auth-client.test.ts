import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  getSession: vi.fn(),
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("better-auth/client", () => ({
  createAuthClient: () => ({
    changePassword: mocks.changePassword,
    getSession: mocks.getSession,
    listSessions: mocks.listSessions,
    revokeSession: mocks.revokeSession,
  }),
}));

import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from "./auth-client";

function activeSession({
  id,
  token,
  ipAddress = null,
  userAgent = null,
}: {
  readonly id: string;
  readonly token: string;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}) {
  return {
    id,
    token,
    createdAt: new Date(),
    expiresAt: new Date(),
    ipAddress,
    userAgent,
  };
}

describe("listSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { token: "current-token" }, user: {} },
      error: null,
    });
  });

  it("maps sessions and marks the current one", async () => {
    mocks.listSessions.mockResolvedValue({
      data: [
        activeSession({ id: "s1", token: "current-token", ipAddress: "1.2.3.4", userAgent: "Chrome" }),
        activeSession({ id: "s2", token: "other-token", ipAddress: "" }),
      ],
      error: null,
    });

    const sessions = await listSessions();

    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.isCurrent).toBe(true);
    expect(sessions[0]?.userAgent).toBe("Chrome");
    expect(sessions[1]?.isCurrent).toBe(false);
    expect(sessions[1]?.ipAddress).toBeNull();
  });

  it("throws when listing sessions fails", async () => {
    mocks.listSessions.mockResolvedValue({
      data: null,
      error: { message: "unable to load" },
    });

    await expect(listSessions()).rejects.toThrow("unable to load");
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Better Auth with current and new password", async () => {
    mocks.changePassword.mockResolvedValue({
      data: { status: true },
      error: null,
    });

    await expect(changePassword("old-password", "new-password")).resolves.toBeUndefined();
    expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
  });

  it("throws when the current password is wrong", async () => {
    mocks.changePassword.mockResolvedValue({
      data: null,
      error: { message: "incorrect password" },
    });

    await expect(
      changePassword("wrong", "new-password"),
    ).rejects.toThrow("incorrect password");
  });
});

describe("revokeSession", () => {
  it("revokes a session by token", async () => {
    mocks.revokeSession.mockResolvedValue({ data: { status: true }, error: null });

    await expect(revokeSession("token-1")).resolves.toBeUndefined();
    expect(mocks.revokeSession).toHaveBeenCalledWith({ token: "token-1" });
  });
});

describe("revokeOtherSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { token: "current-token" }, user: {} },
      error: null,
    });
  });

  it("revokes only non-current sessions", async () => {
    mocks.listSessions.mockResolvedValue({
      data: [
        activeSession({ id: "a", token: "current-token" }),
        activeSession({ id: "b", token: "other-1" }),
        activeSession({ id: "c", token: "other-2" }),
      ],
      error: null,
    });
    mocks.revokeSession.mockResolvedValue({ data: { status: true }, error: null });

    await revokeOtherSessions();

    expect(mocks.revokeSession).toHaveBeenCalledTimes(2);
    expect(mocks.revokeSession).toHaveBeenCalledWith({ token: "other-1" });
    expect(mocks.revokeSession).toHaveBeenCalledWith({ token: "other-2" });
  });
});