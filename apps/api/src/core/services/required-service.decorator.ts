import { SetMetadata } from "@nestjs/common";

import type { ServiceKey } from "@fondo/shared-types";

export const REQUIRED_SERVICE_KEY = "requiredService";

export const RequiredService = (key: ServiceKey): MethodDecorator &
  ClassDecorator => SetMetadata(REQUIRED_SERVICE_KEY, key);