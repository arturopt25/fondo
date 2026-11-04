import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { finalize, type Observable } from "rxjs";

export interface RequestTimings {
  authMs?: number;
  contextMs?: number;
  guardMs?: number;
  handlerMs?: number;
}

export interface TimedRequest {
  readonly method?: string;
  readonly url?: string;
  timings?: RequestTimings;
}

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TimedRequest>();
    const startedAt = performance.now();

    return next.handle().pipe(
      finalize(() => {
        const handlerMs = performance.now() - startedAt;
        const timings: RequestTimings = { ...request.timings, handlerMs };
        request.timings = timings;

        const totalMs = (timings.guardMs ?? 0) + handlerMs;
        const payload = {
          ...timings,
          totalMs,
          method: request.method,
          path: request.url?.split("?")[0],
        };

        if (totalMs >= 2000) {
          this.logger.warn(payload, "slow request");
        } else {
          this.logger.debug(payload, "request timing");
        }
      }),
    );
  }
}
