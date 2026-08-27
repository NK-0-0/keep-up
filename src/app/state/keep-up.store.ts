import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ModulesRepository, PreferencesRepository } from '../data/modules.repository';
import { evaluateModule, summariseSemester } from '../domain/dp-calculator';
import {
  addAssessment,
  clampThreshold,
  createAssessment,
  createModule,
  normaliseMark,
  parseNumber,
  clampPercent,
  removeAssessment,
  updateAssessment,
} from '../domain/module-edits';
import { DEFAULT_PREFERENCES, Module, Preferences, Profile } from '../domain/models';
import { sampleSemester } from '../domain/sample-semester';

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
          : this.modulesRepository
              .watch(ownerId)
              .pipe(catchError((error) => this.recover(error, []))),
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
          : this.preferencesRepository
              .watch(ownerId)
              .pipe(catchError((error) => this.recover(error, DEFAULT_PREFERENCES))),
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
    if (ownerId === null) return;

    try {
      this.errorState.set(null);
      await operation(ownerId);
    } catch (error) {
      this.errorState.set(describe(error));
    }
  }

  /** Reports a stream failure without tearing the dashboard down. */
  private recover<T>(error: unknown, fallback: T) {
    this.errorState.set(describe(error));
    this.loadingState.set(false);
    return of(fallback);
  }
}

function describe(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'permission-denied') {
    return 'You do not have permission to read or write this data. Check your Firestore rules.';
  }
  if (code === 'unavailable') {
    return 'Cannot reach the database right now. Your changes will sync when you are back online.';
  }
  return (error as Error | null)?.message ?? 'Something went wrong. Please try again.';
}
