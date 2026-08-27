import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from './api.tokens';
import { isAppApiUrl } from './api-url';
import { SKIP_AUTH_TOKEN } from './http.context';

/**
 * Attaches the student's Firebase ID token to the app's own API requests.
 *
 * Two deliberate constraints:
 *
 * - Only requests that {@link isAppApiUrl} recognises get a token, so a
 *   credential can never be sent to a third-party host.
 * - It sits *below* the retry interceptor, so each retry fetches the token
 *   again and a refresh that lands mid-retry is picked up.
 *
 * The Firebase SDK's own traffic (auth, Firestore) does not pass through
 * `HttpClient` and is authenticated by the SDK itself.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);

  if (request.context.get(SKIP_AUTH_TOKEN) || !isAppApiUrl(request.url, baseUrl)) {
    return next(request);
  }

  const auth = inject(AuthService);

  return from(auth.getIdToken()).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
  );
};
