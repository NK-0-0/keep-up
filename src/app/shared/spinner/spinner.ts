import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Indeterminate activity ring. Takes its colour from `currentColor`, so it sits
 * correctly inside whatever button or panel hosts it.
 *
 * Purely decorative: the surrounding control is responsible for announcing the
 * busy state (`aria-busy`, or changed label text).
 */
@Component({
  selector: 'ku-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {
  readonly size = input(18);
}
