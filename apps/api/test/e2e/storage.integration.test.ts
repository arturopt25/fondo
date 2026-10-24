import {
  ListBucketsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

const runFlociIntegration = process.env.RUN_FLOCI_INTEGRATION === "1";

describe.skipIf(!runFlociIntegration)("Floci storage integration", () => {
  it("connects to the local Floci S3 endpoint", async () => {
    const client = new S3Client({
      endpoint: process.env.FLOCI_INTEGRATION_ENDPOINT ?? "http://localhost:4566",
      region: "us-east-1",
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      forcePathStyle: true,
    });

    const response = await client.send(new ListBucketsCommand({}));
    expect(response.Buckets).toBeDefined();
    await client.destroy();
  });
});
