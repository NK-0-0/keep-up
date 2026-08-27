import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SemesterSummary } from '../../../../domain/dp-calculator';

/** Headline card: where the student stands across every module at once. */
@Component({
  selector: 'ku-semester-overview',
  templateUrl: './semester-overview.html',
  styleUrl: './semester-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SemesterOverview {
  readonly summary = input.required<SemesterSummary>();
}
