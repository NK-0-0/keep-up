import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { formatPercent, ModuleEvaluation } from '../../../../domain/dp-calculator';
import { ThresholdStepper } from '../../../../shared/threshold-stepper/threshold-stepper';
import { STATUS_LABEL, statusClass } from '../../../../shared/dp-status';

/** Payload for editing one assessment field in place. */
export interface AssessmentFieldChange {
  readonly assessmentId: string;
  readonly value: string;
}

/** Payload for the inline "add assessment" row. */
export interface NewAssessment {
  readonly name: string;
  readonly weight: string;
  readonly mark: string;
}

/**
 * Full-detail module card: the mark breakdown, the DP bar, and every
 * assessment as an editable row.
 */
@Component({
  selector: 'ku-module-detail-card',
  imports: [ThresholdStepper],
  templateUrl: './module-detail-card.html',
  styleUrl: './module-detail-card.scss',
  host: { '[class]': 'statusClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleDetailCard {
  readonly evaluation = input.required<ModuleEvaluation>();

  readonly thresholdChange = output<string | number>();
  readonly moduleRemoved = output<void>();
  readonly assessmentAdded = output<NewAssessment>();
  readonly weightChanged = output<AssessmentFieldChange>();
  readonly markChanged = output<AssessmentFieldChange>();
  readonly assessmentRemoved = output<string>();

  protected readonly addOpen = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftWeight = signal('');
  protected readonly draftMark = signal('');

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

  protected toggleAdd(): void {
    this.addOpen.update((open) => !open);
    this.resetDraft();
  }

  protected saveDraft(): void {
    this.assessmentAdded.emit({
      name: this.draftName(),
      weight: this.draftWeight(),
      mark: this.draftMark(),
    });
    this.resetDraft();
  }

  protected onWeight(assessmentId: string, event: Event): void {
    this.weightChanged.emit({ assessmentId, value: value(event) });
  }

  protected onMark(assessmentId: string, event: Event): void {
    this.markChanged.emit({ assessmentId, value: value(event) });
  }

  protected onDraft(field: 'name' | 'weight' | 'mark', event: Event): void {
    const next = value(event);
    if (field === 'name') this.draftName.set(next);
    else if (field === 'weight') this.draftWeight.set(next);
    else this.draftMark.set(next);
  }

  private resetDraft(): void {
    this.draftName.set('');
    this.draftWeight.set('');
    this.draftMark.set('');
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function value(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
