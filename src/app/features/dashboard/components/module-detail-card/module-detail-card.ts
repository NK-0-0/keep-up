import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { formatPercent, ModuleEvaluation } from '../../../../domain/dp-calculator';
import { ThresholdStepper } from '../../../../shared/threshold-stepper/threshold-stepper';
import {
  AssessmentFieldChange,
  AssessmentTable,
  NewAssessment,
} from '../assessment-table/assessment-table';
import { STATUS_LABEL, statusClass } from '../../../../shared/dp-status';

/** Payload for the inline "add assessment" row. */
export type { AssessmentFieldChange, NewAssessment };

/** Payload for renaming a module's code and/or title. */
export interface ModuleIdentityChange {
  readonly code?: string;
  readonly title?: string;
}

/** Payload for the inline "add assessment" row. */
/**
 * Full-detail module card: the mark breakdown, the DP bar, and every
 * assessment as an editable row.
 */
@Component({
  selector: 'ku-module-detail-card',
  imports: [ThresholdStepper, AssessmentTable],
  templateUrl: './module-detail-card.html',
  styleUrl: './module-detail-card.scss',
  host: { '[class]': 'statusClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleDetailCard {
  readonly evaluation = input.required<ModuleEvaluation>();

  readonly thresholdChange = output<string | number>();
  readonly moduleRenamed = output<ModuleIdentityChange>();
  readonly assessmentRenamed = output<AssessmentFieldChange>();
  readonly moduleRemoved = output<void>();
  readonly assessmentAdded = output<NewAssessment>();
  readonly weightChanged = output<AssessmentFieldChange>();
  readonly markChanged = output<AssessmentFieldChange>();
  readonly assessmentRemoved = output<string>();

  protected readonly editingIdentity = signal(false);
  protected readonly module = computed(() => this.evaluation().module);
  protected readonly statusClass = computed(() => statusClass(this.evaluation().status));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.evaluation().status]);
  protected readonly earnedText = computed(() => formatPercent(this.evaluation().totals.earned));

  protected readonly gradedText = computed(() => {
    const { totals, module } = this.evaluation();
    return `${totals.gradedCount} of ${module.assessments.length} written`;
  });

  /** Banked mark, as a share of the 0–100 bar. */
  protected readonly bankedPercent = computed(() => clamp(this.evaluation().totals.earned));
  /** Best possible mark, drawn as the faint track behind the banked mark. */
  protected readonly potentialPercent = computed(() => clamp(this.evaluation().totals.best));

  protected toggleIdentityEditing(): void {
    this.editingIdentity.update((editing) => !editing);
  }

  protected onCode(event: Event): void {
    this.moduleRenamed.emit({ code: value(event) });
  }

  protected onTitle(event: Event): void {
    this.moduleRenamed.emit({ title: value(event) });
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function value(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
