import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { sizedGooglePhoto } from './google-photo';

/**
 * The student's Google profile picture, falling back to their initials.
 *
 * The fallback is not optional: a Google photo URL can 404 once the account
 * changes it, and privacy extensions block `googleusercontent.com` outright, so
 * the initials have to be ready to take over at runtime rather than only when
 * the URL is absent.
 */
@Component({
  selector: 'ku-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  host: { '[class]': '"avatar--" + variant()', '[style.--avatar-size.px]': 'size()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly photoUrl = input<string | null>(null);
  readonly initials = input.required<string>();
  readonly size = input(38);
  /** `chip` is the flat header treatment; `gradient` is the larger profile one. */
  readonly variant = input<'chip' | 'gradient'>('chip');

  /** Resets whenever a new photo arrives, so a fresh URL gets a fresh attempt. */
  protected readonly loadFailed = linkedSignal<string | null, boolean>({
    source: () => this.photoUrl(),
    computation: () => false,
  });

  protected readonly photo = computed(() => {
    const url = this.photoUrl();
    if (!url || this.loadFailed()) return null;

    // Request at 2× for HiDPI screens.
    return sizedGooglePhoto(url, this.size() * 2);
  });

  protected onError(): void {
    this.loadFailed.set(true);
  }
}
