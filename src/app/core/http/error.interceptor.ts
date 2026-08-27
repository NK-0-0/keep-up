import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RETURN_URL_PARAM } from '../auth/auth.guard';
import { NotificationService } from '../notifications/notification.service';
import { toApiFailure } from './api-failure';
import { SKIP_ERROR_NOTIFICATION } from './http.context';

/**
 * Single place where a failed request becomes something the app can act on:
 *
 * - normalises every `HttpErrorResponse` into an {@link ApiFailure};
 * - raises one notification per failed request, unless the caller opted out
 *   with {@link SKIP_ERROR_NOTIFICATION};
 * - treats a 401 as an expired session and sends the student back to sign-in.
 *
 * Sits above the retry interceptor so a request that eventually succeeds never
 * produces a message.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      const failure = toApiFailure(error);

      if (failure.status === 401) {
        void endExpiredSession(auth, router);
      }

      if (!request.context.get(SKIP_ERROR_NOTIFICATION)) {
        notifications.error(failure.message);
      }

      return throwError(() => failure);
    }),
  );
};

async function endExpiredSession(auth: AuthService, router: Router): Promise<void> {
  // Already on the way out — do not stack redirects when several requests
  // fail together.
  if (router.url.startsWith('/sign-in')) return;

  const returnUrl = router.url;
  await auth.signOut();
  await router.navigate(['/sign-in'], {
    queryParams: returnUrl === '/' ? {} : { [RETURN_URL_PARAM]: returnUrl },
  });
}
