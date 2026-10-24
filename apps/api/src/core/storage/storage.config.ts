import type { AppConfig } from "../config/app-config.js";
import { loadAppConfig } from "../config/app-config.js";
import type { StorageConfig } from "./storage.types.js";

export function loadStorageConfig(appConfig: AppConfig = loadAppConfig()): StorageConfig {
  return {
    endpointUrl: appConfig.awsEndpointUrl,
    region: appConfig.awsRegion,
    accessKeyId: appConfig.awsAccessKeyId,
    secretAccessKey: appConfig.awsSecretAccessKey,
    bucketName: appConfig.s3BucketName,
    forcePathStyle: appConfig.s3ForcePathStyle,
    presignExpirySeconds: appConfig.s3PresignExpirySeconds,
    maxFileSizeBytes: appConfig.s3MaxFileSizeBytes,
    avatarMaxFileSizeBytes: appConfig.s3AvatarMaxFileSizeBytes,
  };
}
