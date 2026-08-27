import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Avatar } from '../../../../shared/avatar/avatar';
import { Logo } from '../../../../shared/logo/logo';
import { Spinner } from '../../../../shared/spinner/spinner';

/** Sticky application header: identity, the default DP bar, and the account chip. */
@Component({
  selector: 'ku-site-header',
  imports: [Avatar, Logo, Spinner],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly defaultThreshold = input.required<number>();
  readonly initials = input.required<string>();
  readonly photoUrl = input<string | null>(null);
  readonly showSignOut = input(false);
  readonly signingOut = input(false);

  readonly signOut = output<void>();
}
