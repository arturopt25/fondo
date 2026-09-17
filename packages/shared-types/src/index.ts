export interface HealthResponse {
  readonly status: "ok";
  readonly service: "api";
}

export * from "./enums.js";
export * from "./me.js";
export * from "./timezone.js";