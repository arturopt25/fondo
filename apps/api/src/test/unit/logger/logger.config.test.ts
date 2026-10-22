import { PassThrough } from "node:stream";

import pino from "pino";
import type { Options } from "pino-http";
import { describe, expect, it } from "vitest";

import {
  createLoggerParams,
  isValidRequestId,
} from "../../../core/logger/logger.config.js";

describe("logger configuration", () => {
  it("accepts only UUID request ids", () => {
    expect(isValidRequestId("123e4567-e89b-12d3-a456-426614174000")).toBe(
      true,
    );
    expect(isValidRequestId("not-a-uuid")).toBe(false);
  });

  it("does not emit authorization, cookies, tokens or query strings", () => {
    const output = new PassThrough();
    let serialized = "";
    output.on("data", (chunk: Buffer) => {
      serialized += chunk.toString();
    });

    const pinoHttp = createLoggerParams("info").pinoHttp as Options;
    if (!pinoHttp.redact || !pinoHttp.serializers) {
      throw new Error("Expected redaction and serializer configuration");
    }
    const logger = pino(
      {
        redact: pinoHttp.redact,
        serializers: pinoHttp.serializers,
      },
      output,
    );

    logger.info(
      {
        req: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          method: "GET",
          url: "/api/v1/me?token=secret-token",
          headers: {
            authorization: "Bearer authorization-secret",
            cookie: "session=private-cookie",
          },
          body: {
            password: "password-secret",
            accessToken: "access-token-secret",
          },
        },
      },
      "request completed",
    );
    logger.flush();

    expect(serialized).not.toContain("authorization-secret");
    expect(serialized).not.toContain("private-cookie");
    expect(serialized).not.toContain("password-secret");
    expect(serialized).not.toContain("access-token-secret");
    expect(serialized).not.toContain("token=secret-token");
    expect(serialized).toContain("/api/v1/me");
  });
});
