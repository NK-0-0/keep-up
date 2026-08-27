import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError, timeout, TimeoutError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { REQUEST_TIMEOUT_MS } from './http.context';

/**
 * Caps how long a single attempt may hang. A stalled connection otherwise sits
 * there indefinitely — `fetch` has no timeout of its own — leaving the progress
 * bar spinning with nothing to show for it.
 *
 * The timeout surfaces as a 408, so the retry and error interceptors treat it
 * like any other transient failure rather than needing a special case. It sits
 * inside the retry interceptor, so the budget applies per attempt.
 */
export const timeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const budget = request.context.get(REQUEST_TIMEOUT_MS);
  if (budget <= 0) return next(request);

  return next(request).pipe(
    timeout({ each: budget }),
    catchError((error: unknown) =>
      throwError(() => (error instanceof TimeoutError ? asTimeoutResponse(request.url) : error)),
    ),
  );
};

function asTimeoutResponse(url: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 408,
    statusText: 'Request Timeout',
    url,
    error: { message: 'The server took too long to respond. Please try again.' },
  });
}
