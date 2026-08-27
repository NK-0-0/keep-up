import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { provideKeepUpData } from '../../data/data.providers';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { KeepUpStore } from '../../state/keep-up.store';
import { ModuleGlanceCard } from './components/module-glance-card/module-glance-card';
import {
  AssessmentFieldChange,
  ModuleDetailCard,
  NewAssessment,
} from './components/module-detail-card/module-detail-card';
import { ProfileCard } from './components/profile-card/profile-card';
import { SemesterOverview } from './components/semester-overview/semester-overview';
import { SiteHeader } from './components/site-header/site-header';

type ViewMode = 'glance' | 'detail';

/**
 * The dashboard. Holds only view-local state (which layout is showing, whether
 * a form is open) and delegates everything persistent to `KeepUpStore`.
 */
@Component({
  selector: 'ku-dashboard',
  imports: [SiteHeader, ProfileCard, SemesterOverview, ModuleGlanceCard, ModuleDetailCard],
  // Provided here rather than in the (eagerly evaluated) route table so the
  // Firestore SDK is bundled with this lazy chunk, not the initial download.
  providers: [provideKeepUpData()],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);

  protected readonly store = inject(KeepUpStore);
  protected readonly syncedToCloud = inject(FirebaseService).enabled;
  protected readonly canSignOut = computed(() => this.auth.status() === 'signed-in');
  protected readonly photoUrl = computed(() => this.auth.user()?.photoURL ?? null);

  protected readonly view = signal<ViewMode>('glance');
  protected readonly addingModule = signal(false);
  protected readonly confirmingClear = signal(false);
  protected readonly newCode = signal('');
  protected readonly newTitle = signal('');

  /** The empty state replaces the grid, but not while the add form is open. */
  protected readonly showEmptyState = computed(
    () => this.store.isEmpty() && !this.addingModule() && !this.store.loading(),
  );

  protected setView(view: ViewMode): void {
    this.view.set(view);
  }

  protected toggleAddModule(): void {
    this.addingModule.update((open) => !open);
    this.newCode.set('');
    this.newTitle.set('');
  }

  protected addModule(): void {
    this.store.addModule(this.newCode(), this.newTitle());
    this.addingModule.set(false);
    this.newCode.set('');
    this.newTitle.set('');
  }

  protected clearEverything(): void {
    if (!this.confirmingClear()) {
      this.confirmingClear.set(true);
      return;
    }
    this.store.clearAll();
    this.confirmingClear.set(false);
  }

  protected addAssessment(moduleId: string, assessment: NewAssessment): void {
    this.store.addAssessment(moduleId, assessment.name, assessment.weight, assessment.mark);
  }

  protected changeWeight(moduleId: string, change: AssessmentFieldChange): void {
    this.store.setAssessmentWeight(moduleId, change.assessmentId, change.value);
  }

  protected changeMark(moduleId: string, change: AssessmentFieldChange): void {
    this.store.setAssessmentMark(moduleId, change.assessmentId, change.value);
  }

  protected onFieldInput(target: 'code' | 'title', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (target === 'code') this.newCode.set(value);
    else this.newTitle.set(value);
  }

  protected signOut(): void {
    void this.auth.signOut();
  }
}
