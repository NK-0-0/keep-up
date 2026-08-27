import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPercent, ModuleEvaluation } from '../../../../domain/dp-calculator';
import { STATUS_LABEL, statusClass } from '../../../../shared/dp-status';

/** Compact "at a glance" tile: one ring per module and the headline verdict. */
@Component({
  selector: 'ku-module-glance-card',
  templateUrl: './module-glance-card.html',
  styleUrl: './module-glance-card.scss',
  host: { '[class]': 'statusClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleGlanceCard {
  readonly evaluation = input.required<ModuleEvaluation>();

  protected readonly statusClass = computed(() => statusClass(this.evaluation().status));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.evaluation().status]);
  protected readonly earnedText = computed(() => formatPercent(this.evaluation().totals.earned));

  /** Sweep of the progress ring, clamped so odd data cannot overflow the circle. */
  protected readonly ringSweep = computed(
    () => `${Math.max(0, Math.min(100, this.evaluation().totals.earned))}%`,
  );
}
