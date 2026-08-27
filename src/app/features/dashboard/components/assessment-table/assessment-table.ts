import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Assessment } from '../../../../domain/models';

/** Payload for editing one field of an existing assessment. */
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
 * The editable list of assessments inside a module card: name, weight and mark
 * per row, plus the inline row for adding another.
 *
 * Split out of `ModuleDetailCard` because it is a self-contained unit with its
 * own draft state — the card around it deals with the module, this deals with
 * what the module is made of.
 */
@Component({
  selector: 'ku-assessment-table',
  templateUrl: './assessment-table.html',
  styleUrl: './assessment-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentTable {
  readonly assessments = input.required<readonly Assessment[]>();
  /** Names the controls for screen readers, e.g. "CSC2601". */
  readonly moduleCode = input.required<string>();

  readonly nameChanged = output<AssessmentFieldChange>();
  readonly weightChanged = output<AssessmentFieldChange>();
  readonly markChanged = output<AssessmentFieldChange>();
  readonly removed = output<string>();
  readonly added = output<NewAssessment>();

  protected readonly addOpen = signal(false);
  protected readonly draftName = signal('');
  protected readonly draftWeight = signal('');
  protected readonly draftMark = signal('');

  protected toggleAdd(): void {
    this.addOpen.update((open) => !open);
    this.resetDraft();
  }

  protected saveDraft(): void {
    this.added.emit({
      name: this.draftName(),
      weight: this.draftWeight(),
      mark: this.draftMark(),
    });
    this.resetDraft();
  }

  protected onName(assessmentId: string, event: Event): void {
    this.nameChanged.emit({ assessmentId, value: value(event) });
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

function value(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
