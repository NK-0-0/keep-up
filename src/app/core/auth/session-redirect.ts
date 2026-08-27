import { effect, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStatus } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Sends the student back to sign-in when an established session ends.
 *
 * The route guards only run on navigation, so without this a sign-out leaves
 * the current page mounted and stale. Watching the auth status instead of
 * hooking the sign-out button means this also covers a revoked or expired
 * token, and a sign-out performed in another tab — Firebase propagates all of
 * those through the same channel.
 *
 * Instantiated by the app shell.
 */
@Injectable({ providedIn: 'root' })
export class SessionRedirect {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Only a signed-in → signed-out transition triggers a redirect. The initial
   * `pending → signed-out` on a cold load is the guards' job, and reacting to
   * it here would race them and lose the `returnUrl`.
   */
  private previousStatus: AuthStatus | null = null;

  constructor() {
    effect(() => {
      const status = this.auth.status();
      const sessionEnded = this.previousStatus === 'signed-in' && status === 'signed-out';
      this.previousStatus = status;

      if (!sessionEnded || this.router.url.startsWith('/sign-in')) return;

      void this.router.navigate(['/sign-in']);
    });
  }
}
