import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api.tokens';
import { isAppApiUrl } from './api-url';
import { createId } from '../../domain/module-edits';

/** Header the API echoes into its logs, tying a client action to a server trace. */
export const CORRELATION_ID_HEADER = 'X-Request-Id';

/**
 * Tags each logical request with an id. Applied above the retry interceptor, so
 * every attempt at the same request shares one id and the server can tell
 * retries apart from genuinely new calls.
 *
 * Only sent to the app's own API — a custom header would force a CORS preflight
 * on third-party endpoints for no benefit.
 */
export const correlationIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isAppApiUrl(request.url, inject(API_BASE_URL))) return next(request);

  return next(request.clone({ setHeaders: { [CORRELATION_ID_HEADER]: createId() } }));
};
