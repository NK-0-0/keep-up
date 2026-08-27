import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';

/** Query parameter carrying the page the student was trying to reach. */
export const RETURN_URL_PARAM = 'returnUrl';

/**
 * Guards a route behind a resolved session. Waits for Firebase to restore any
 * persisted sign-in first, so a refresh on a protected page does not bounce the
 * student to sign-in before the session has loaded.
 *
 * In local mode (no Firebase config) there is no session to check and access is
 * always granted.
 */
export const authGuard: CanActivateFn = async (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  if (auth.canAccessData()) return true;

  return router.createUrlTree(['/sign-in'], {
    queryParams: state.url === '/' ? {} : { [RETURN_URL_PARAM]: state.url },
  });
};

/**
 * Keeps an already-signed-in student off the sign-in page, sending them to
 * whatever they were originally trying to reach.
 */
export const guestGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  if (!auth.canAccessData()) return true;

  return router.parseUrl(safeReturnUrl(route.queryParamMap.get(RETURN_URL_PARAM)));
};

/**
 * Narrows a `returnUrl` to an in-app path. Anything else — an absolute URL, a
 * protocol-relative `//host` path, a backslash variant — is discarded, so a
 * crafted link cannot bounce a freshly signed-in student off-site.
 */
export function safeReturnUrl(candidate: string | null | undefined): string {
  if (!candidate) return '/';

  const normalised = candidate.replaceAll('\\', '/');
  const isInAppPath = normalised.startsWith('/') && !normalised.startsWith('//');
  return isInAppPath ? normalised : '/';
}
