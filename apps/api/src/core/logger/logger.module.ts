import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";

import { parseLogLevel } from "../config/app-config.js";
import { createLoggerParams } from "./logger.config.js";

@Module({
  imports: [
    LoggerModule.forRoot(
      {
        ...createLoggerParams(parseLogLevel(process.env.LOG_LEVEL)),
        useExisting: true,
      },
    ),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
