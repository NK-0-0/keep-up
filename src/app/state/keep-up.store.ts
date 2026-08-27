import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, retry, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ModulesRepository, PreferencesRepository } from '../data/modules.repository';
import { evaluateModule, summariseSemester } from '../domain/dp-calculator';
import {
  addAssessment,
  clampThreshold,
  createAssessment,
  createModule,
  normaliseMark,
  normaliseText,
  parseNumber,
  renameModule,
  clampPercent,
  removeAssessment,
  updateAssessment,
} from '../domain/module-edits';
import { DEFAULT_PREFERENCES, Module, Preferences, Profile } from '../domain/models';
import { sampleSemester } from '../domain/sample-semester';

/**
 * A terminated listener never recovers on its own, so retry a few times before
 * giving up. This is what lets the dashboard heal by itself once the Firestore
 * rules are deployed, instead of needing a reload.
 */
const RETRY_ATTEMPTS = 3;

function retryDelay(_error: unknown, attempt: number) {
  return timer(Math.min(500 * 2 ** (attempt - 1), 4_000));
}

/**
 * Single source of truth for the dashboard. Holds the persisted state as
 * signals, derives every value the UI renders, and is the only place that
 * writes through the repositories.
 *
 * Provided by the dashboard route (see `provideKeepUpData`) rather than in
 * root, so its lifetime and its Firestore dependency are both route-scoped.
 */
@Injectable()
export class KeepUpStore {
  private readonly auth = inject(AuthService);
  private readonly modulesRepository = inject(ModulesRepository);
  private readonly preferencesRepository = inject(PreferencesRepository);

  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);

  /** Re-subscribes whenever the signed-in student changes. */
  private readonly ownerId = this.auth.ownerId;

  readonly modules = toSignal(
    toObservable(this.ownerId).pipe(
      tap(() => this.loadingState.set(true)),
      switchMap((ownerId) =>
        ownerId === null
          ? of<Module[]>([])
          : this.modulesRepository.watch(ownerId).pipe(
              retry({ count: RETRY_ATTEMPTS, delay: retryDelay }),
              catchError((error) => this.recover(error, [])),
            ),
      ),
      tap(() => this.loadingState.set(false)),
    ),
    { initialValue: [] as Module[] },
  );

  private readonly storedPreferences = toSignal(
    toObservable(this.ownerId).pipe(
      switchMap((ownerId) =>
        ownerId === null
          ? of(DEFAULT_PREFERENCES)
          : this.preferencesRepository.watch(ownerId).pipe(
              retry({ count: RETRY_ATTEMPTS, delay: retryDelay }),
              catchError((error) => this.recover(error, DEFAULT_PREFERENCES)),
            ),
      ),
    ),
    { initialValue: DEFAULT_PREFERENCES },
  );

  /** Stored preferences, falling back to the Google account name on first run. */
  readonly preferences = computed<Preferences>(() => {
    const stored = this.storedPreferences();
    if (stored.profile.name) return stored;

    const displayName = this.auth.user()?.displayName;
    return displayName ? { ...stored, profile: { ...stored.profile, name: displayName } } : stored;
  });

  readonly profile = computed(() => this.preferences().profile);
  readonly defaultThreshold = computed(() => this.preferences().defaultThreshold);

  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly evaluations = computed(() => {
    const defaultThreshold = this.defaultThreshold();
    return this.modules().map((module) => evaluateModule(module, defaultThreshold));
  });

  readonly summary = computed(() => summariseSemester(this.evaluations()));
  readonly isEmpty = computed(() => this.modules().length === 0);

  /** Two-letter monogram used by the avatar chips. */
  readonly initials = computed(() => {
    const name = this.profile().name.trim();
    if (!name) return '?';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  });

  dismissError(): void {
    this.errorState.set(null);
  }

  // --- Module commands -----------------------------------------------------

  addModule(code: string, title: string): void {
    const order = this.modules().reduce((max, module) => Math.max(max, module.order), -1) + 1;
    void this.write((ownerId) =>
      this.modulesRepository.save(ownerId, createModule(code, title, order)),
    );
  }

  /** Renames a module in place; its document id is untouched. */
  updateModule(moduleId: string, changes: { code?: string; title?: string }): void {
    this.patch(moduleId, (module) => renameModule(module, changes));
  }

  removeModule(moduleId: string): void {
    void this.write((ownerId) => this.modulesRepository.remove(ownerId, moduleId));
  }

  setModuleThreshold(moduleId: string, value: string | number): void {
    this.patch(moduleId, (module) => ({
      ...module,
      threshold: clampThreshold(value, module.threshold ?? this.defaultThreshold()),
    }));
  }

  // --- Assessment commands -------------------------------------------------

  addAssessment(moduleId: string, name: string, weight: string, mark: string): void {
    this.patch(moduleId, (module) => addAssessment(module, createAssessment(name, weight, mark)));
  }

  setAssessmentWeight(moduleId: string, assessmentId: string, value: string): void {
    const weight = clampPercent(parseNumber(value) ?? 0);
    this.patch(moduleId, (module) => updateAssessment(module, assessmentId, { weight }));
  }

  setAssessmentMark(moduleId: string, assessmentId: string, value: string): void {
    const mark = normaliseMark(value);
    this.patch(moduleId, (module) => updateAssessment(module, assessmentId, { mark }));
  }

  setAssessmentName(moduleId: string, assessmentId: string, value: string): void {
    this.patch(moduleId, (module) => {
      const current = module.assessments.find((entry) => entry.id === assessmentId);
      const name = normaliseText(value, current?.name ?? 'Assessment');
      return updateAssessment(module, assessmentId, { name });
    });
  }

  removeAssessment(moduleId: string, assessmentId: string): void {
    this.patch(moduleId, (module) => removeAssessment(module, assessmentId));
  }

  // --- Preference commands -------------------------------------------------

  setDefaultThreshold(value: string | number): void {
    const defaultThreshold = clampThreshold(value, this.defaultThreshold());
    this.savePreferences({ ...this.preferences(), defaultThreshold });
  }

  updateProfile(changes: Partial<Profile>): void {
    const current = this.preferences();
    this.savePreferences({ ...current, profile: { ...current.profile, ...changes } });
  }

  // --- Bulk commands -------------------------------------------------------

  loadSample(): void {
    void this.write((ownerId) => this.modulesRepository.replaceAll(ownerId, sampleSemester()));
  }

  clearAll(): void {
    void this.write((ownerId) => this.modulesRepository.replaceAll(ownerId, []));
  }

  // --- Internals -----------------------------------------------------------

  private patch(moduleId: string, change: (module: Module) => Module): void {
    const module = this.modules().find((candidate) => candidate.id === moduleId);
    if (!module) return;
    void this.write((ownerId) => this.modulesRepository.save(ownerId, change(module)));
  }

  private savePreferences(preferences: Preferences): void {
    void this.write((ownerId) => this.preferencesRepository.save(ownerId, preferences));
  }

  private async write(operation: (ownerId: string) => Promise<void>): Promise<void> {
    const ownerId = this.ownerId();
    if (ownerId === null) {
      // Nothing is signed in yet, so there is nowhere to write. Silently
      // dropping the edit here is what makes a broken session look like a
      // broken save, so say so instead.
      this.errorState.set('You are not signed in, so that change was not saved.');
      report('write', new Error('No owner id: the session has not resolved.'));
      return;
    }

    try {
      this.errorState.set(null);
      await operation(ownerId);
    } catch (error) {
      report('write', error);
      this.errorState.set(describe(error));
    }
  }

  /** Reports a stream failure without tearing the dashboard down. */
  private recover<T>(error: unknown, fallback: T) {
    report('read', error);
    this.errorState.set(describe(error));
    this.loadingState.set(false);
    return of(fallback);
  }
}

function describe(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'permission-denied':
      return 'Your Firestore rules rejected that. Deploy firestore.rules: firebase deploy --only firestore:rules';
    case 'unauthenticated':
      return 'Your session has expired. Sign in again to keep saving.';
    case 'unavailable':
      return 'Cannot reach the database right now. Your changes will sync when you are back online.';
    case 'failed-precondition':
      return 'Firestore rejected that request. Check that the database exists and is in Native mode.';
    case 'not-found':
      return 'That Firestore database could not be found. Check the project id in your environment file.';
    default:
      return (error as Error | null)?.message ?? 'Something went wrong. Please try again.';
  }
}

/**
 * Puts the raw Firebase error in the console alongside the friendly message.
 * The `code` is what actually identifies the problem — `permission-denied`
 * versus `unavailable` are very different fixes — and it is lost by the time
 * the message reaches the banner.
 */
function report(operation: 'read' | 'write', error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? 'unknown';
  console.error(`[KeepUp] Firestore ${operation} failed (code: ${code})`, error);
}
