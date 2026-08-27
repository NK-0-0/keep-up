import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The KeepUp mark: three rising bars crossing a DP threshold line — the product
 * in one glyph. Used in the header, on the sign-in panel, and as the favicon
 * (`public/favicon.svg`, which must be kept in step with this artwork).
 */
@Component({
  selector: 'ku-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  /** Rendered edge length in pixels. */
  readonly size = input(38);
}
