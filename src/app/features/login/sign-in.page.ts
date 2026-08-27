import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Logo } from '../../shared/logo/logo';
import { Spinner } from '../../shared/spinner/spinner';
import { RETURN_URL_PARAM, safeReturnUrl } from '../../core/auth/auth.guard';

/**
 * Google OAuth entry point. Shown only when Firebase is configured — otherwise
 * the auth guard treats the session as local and goes straight to the dashboard.
 */
@Component({
  selector: 'ku-sign-in',
  imports: [Logo, Spinner],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();

    // The popup flow leaves the student on this page, so navigate on success.
    // The redirect fallback never gets here — the page has already unloaded,
    // and `guestGuard` handles the return trip.
    if (this.auth.canAccessData()) {
      await this.router.navigateByUrl(
        safeReturnUrl(this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM)),
      );
    }
  }
}
