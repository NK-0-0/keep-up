import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';
import { isRetryableStatus } from './api-failure';
import { MAX_RETRIES } from './http.context';

/** Base of the exponential backoff. */
const BASE_DELAY_MS = 400;
/** Ceiling for any single wait, including a server-supplied `Retry-After`. */
const MAX_DELAY_MS = 8_000;

/**
 * Methods safe to replay. A failed POST may well have been applied server-side
 * before the response was lost, so those are never retried automatically —
 * setting {@link MAX_RETRIES} on one has no effect by design.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Retries transient failures — dropped connections, timeouts, throttling and
 * 5xx — with exponential backoff plus jitter, honouring `Retry-After` when the
 * server sends one.
 *
 * Placed below the error interceptor so the student sees at most one message,
 * raised only once the retries are exhausted.
 */
export const retryInterceptor: HttpInterceptorFn = (request, next) => {
  const count = request.context.get(MAX_RETRIES);
  if (count <= 0 || !isSafeToReplay(request)) return next(request);

  return next(request).pipe(
    retry({
      count,
      delay: (error, attempt) => {
        if (!(error instanceof HttpErrorResponse) || !isRetryableStatus(error.status)) {
          return throwError(() => error);
        }
        return timer(nextDelay(error, attempt));
      },
    }),
  );
};

function isSafeToReplay(request: HttpRequest<unknown>): boolean {
  return SAFE_METHODS.has(request.method.toUpperCase());
}

function nextDelay(error: HttpErrorResponse, attempt: number): number {
  const retryAfter = readRetryAfter(error);
  if (retryAfter !== null) return Math.min(retryAfter, MAX_DELAY_MS);

  const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
  // Jitter keeps a wave of clients from retrying in lockstep after an outage.
  return Math.min(backoff + Math.random() * BASE_DELAY_MS, MAX_DELAY_MS);
}

/** Reads `Retry-After` in either of its forms: delay-seconds or an HTTP date. */
function readRetryAfter(error: HttpErrorResponse): number | null {
  const header = error.headers?.get('Retry-After');
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}
