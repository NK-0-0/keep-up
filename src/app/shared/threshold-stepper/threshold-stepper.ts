import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MAX_THRESHOLD, MIN_THRESHOLD } from '../../domain/models';

/** How much the −/+ buttons move the DP bar. */
const STEP = 5;

/**
 * Numeric stepper for a DP threshold. Used for the student-wide default and
 * for each module's override, so the two always behave identically.
 */
@Component({
  selector: 'ku-threshold-stepper',
  templateUrl: './threshold-stepper.html',
  styleUrl: './threshold-stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThresholdStepper {
  readonly value = input.required<number>();
  /** Describes the control for screen readers, e.g. "DP bar for CSC2601". */
  readonly label = input.required<string>();
  readonly compact = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string | number>();

  protected step(delta: number): void {
    const next = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, this.value() + delta));
    this.valueChange.emit(next);
  }

  protected commit(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  protected readonly stepSize = STEP;
}
