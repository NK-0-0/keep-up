import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Profile } from '../../../../domain/models';
import { Avatar } from '../../../../shared/avatar/avatar';
import { ThresholdStepper } from '../../../../shared/threshold-stepper/threshold-stepper';

/** Student identity card, with the default DP bar that new modules inherit. */
@Component({
  selector: 'ku-profile-card',
  imports: [Avatar, ThresholdStepper],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCard {
  readonly profile = input.required<Profile>();
  readonly initials = input.required<string>();
  readonly photoUrl = input<string | null>(null);
  readonly defaultThreshold = input.required<number>();

  readonly profileChange = output<Partial<Profile>>();
  readonly defaultThresholdChange = output<string | number>();

  protected readonly editing = signal(false);

  /** "BSc Computer Science · 2nd year", skipping whichever field is blank. */
  protected readonly meta = computed(() =>
    [this.profile().course, this.profile().year].filter(Boolean).join('  ·  '),
  );

  protected toggleEditing(): void {
    this.editing.update((editing) => !editing);
  }

  protected update(field: keyof Profile, event: Event): void {
    this.profileChange.emit({ [field]: (event.target as HTMLInputElement).value });
  }
}
