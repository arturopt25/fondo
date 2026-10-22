import { afterEach, describe, expect, it } from "vitest";

import {
  loadAppConfig,
  parseWebOrigins,
} from "../../../core/config/app-config.js";

const REQUIRED = {
  DATABASE_URL: "postgresql://localhost/fondo",
  APP_DATABASE_URL: "postgresql://fondo_app@localhost/fondo",
  BETTER_AUTH_SECRET: "a-secret-that-is-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000/api/v1/auth",
};

function setEnv(overrides: Partial<Record<string, string | undefined>>): void {
  for (const [key, value] of Object.entries(REQUIRED)) {
    if (overrides[key] === undefined && !(key in overrides)) {
      process.env[key] = value;
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

  afterEach(() => {
  for (const key of Object.keys(REQUIRED)) {
    delete process.env[key];
  }
  delete process.env.WEB_ORIGIN;
  delete process.env.LOG_LEVEL;
});

describe("loadAppConfig", () => {
  it("returns the config when all required variables are present", () => {
    setEnv({ WEB_ORIGIN: "http://localhost:5173" });

    const config = loadAppConfig();

    expect(config.databaseUrl).toBe("postgresql://localhost/fondo");
    expect(config.appDatabaseUrl).toBe(
      "postgresql://fondo_app@localhost/fondo",
    );
    expect(config.webOrigins).toEqual(["http://localhost:5173"]);
  });

  it("parses and deduplicates comma-separated origins", () => {
    setEnv({
      WEB_ORIGIN:
        "https://app.example.com, http://localhost:5173, https://app.example.com",
    });

    expect(loadAppConfig().webOrigins).toEqual([
      "https://app.example.com",
      "http://localhost:5173",
    ]);
  });

  it.each([
    "*",
    "https://*.example.com",
    "localhost:5173",
    "https://app.example.com/",
    "https://app.example.com/dashboard",
    "https://app.example.com?token=secret",
  ])("rejects invalid web origin %s", (origin) => {
    expect(() => parseWebOrigins(origin)).toThrow(/WEB_ORIGIN/);
  });

  it("fails fast when a required variable is missing", () => {
    setEnv({ BETTER_AUTH_SECRET: undefined, BETTER_AUTH_URL: undefined });

    expect(() => loadAppConfig()).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadAppConfig()).toThrow(/BETTER_AUTH_URL/);
  });

  it("rejects a short auth secret", () => {
    setEnv({ BETTER_AUTH_SECRET: "short" });

    expect(() => loadAppConfig()).toThrow(/at least 32 characters/);
  });

  it("defaults LOG_LEVEL to info and validates configured levels", () => {
    setEnv({ LOG_LEVEL: "debug" });

    expect(loadAppConfig().logLevel).toBe("debug");
  });

  it("rejects an unknown LOG_LEVEL", () => {
    setEnv({ LOG_LEVEL: "verbose" });

    expect(() => loadAppConfig()).toThrow(/LOG_LEVEL/);
  });
});
