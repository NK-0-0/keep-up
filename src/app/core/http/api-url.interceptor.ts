import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api.tokens';
import { resolveApiUrl } from './api-url';

/**
 * Expands `/api/...` paths against `API_BASE_URL`, so calling code writes
 * `http.get('/api/modules')` and never hard-codes an environment's host.
 *
 * Runs first in the chain, so every interceptor after it sees the final URL.
 */
export const apiUrlInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  const url = resolveApiUrl(request.url, baseUrl);

  return next(url === request.url ? request : request.clone({ url }));
};
