import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ModulesRepository, PreferencesRepository } from '../data/modules.repository';
import { DEFAULT_PREFERENCES, Module, Preferences } from '../domain/models';
import { KeepUpStore } from './keep-up.store';

class FakeModulesRepository extends ModulesRepository {
  readonly modules = new BehaviorSubject<Module[]>([]);
  failNextWrite = false;

  watch(): Observable<Module[]> {
    return this.modules.asObservable();
  }

  async save(_ownerId: string, module: Module): Promise<void> {
    this.guard();
    const current = this.modules.value;
    const index = current.findIndex((candidate) => candidate.id === module.id);
    this.modules.next(
      index === -1
        ? [...current, module]
        : current.map((candidate) => (candidate.id === module.id ? module : candidate)),
    );
  }

  async remove(_ownerId: string, moduleId: string): Promise<void> {
    this.guard();
    this.modules.next(this.modules.value.filter((module) => module.id !== moduleId));
  }

  async replaceAll(_ownerId: string, modules: readonly Module[]): Promise<void> {
    this.guard();
    this.modules.next([...modules]);
  }

  private guard(): void {
    if (!this.failNextWrite) return;
    this.failNextWrite = false;
    throw Object.assign(new Error('denied'), { code: 'permission-denied' });
  }
}

class FakePreferencesRepository extends PreferencesRepository {
  readonly preferences = new BehaviorSubject<Preferences>(DEFAULT_PREFERENCES);

  watch(): Observable<Preferences> {
    return this.preferences.asObservable();
  }

  async save(_ownerId: string, preferences: Preferences): Promise<void> {
    this.preferences.next(preferences);
  }
}

describe('KeepUpStore', () => {
  let store: KeepUpStore;
  let modules: FakeModulesRepository;
  let preferences: FakePreferencesRepository;

  /** Flushes the effect behind `toObservable`, then any pending microtasks. */
  async function settle(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  }

  beforeEach(async () => {
    modules = new FakeModulesRepository();
    preferences = new FakePreferencesRepository();

    TestBed.configureTestingModule({
      providers: [
        KeepUpStore,
        { provide: ModulesRepository, useValue: modules },
        { provide: PreferencesRepository, useValue: preferences },
      ],
    });

    store = TestBed.inject(KeepUpStore);
    await settle();
  });

  it('starts empty, with the app running in local mode', async () => {
    expect(store.isEmpty()).toBe(true);
    expect(store.summary().title).toBe('Let us set up your semester');
    expect(store.loading()).toBe(false);
  });

  it('adds a module and evaluates it against the default bar', async () => {
    store.addModule('csc2601', 'Database Systems');
    await settle();

    expect(modules.modules.value).toHaveLength(1);
    expect(store.evaluations()[0].module.code).toBe('CSC2601');
    expect(store.evaluations()[0].threshold).toBe(50);
  });

  it('re-evaluates when an assessment mark is captured', async () => {
    store.addModule('CSC2601', 'Database Systems');
    await settle();
    const moduleId = store.modules()[0].id;

    store.addAssessment(moduleId, 'Test 1', '100', '');
    await settle();
    expect(store.evaluations()[0].status).toBe('in-progress');

    const assessmentId = store.modules()[0].assessments[0].id;
    store.setAssessmentMark(moduleId, assessmentId, '72');
    await settle();

    expect(store.evaluations()[0].status).toBe('secured');
    expect(store.summary().secured).toBe(1);
  });

  it('applies a module threshold override without touching the default', async () => {
    store.addModule('MAT1512', 'Calculus A');
    await settle();
    const moduleId = store.modules()[0].id;

    store.setModuleThreshold(moduleId, '40');
    await settle();

    expect(store.evaluations()[0].threshold).toBe(40);
    expect(store.defaultThreshold()).toBe(50);
  });

  it('applies the default bar to modules that do not override it', async () => {
    store.addModule('ECO1101', 'Microeconomics');
    await settle();

    store.setDefaultThreshold(60);
    await settle();

    expect(store.defaultThreshold()).toBe(60);
    expect(store.evaluations()[0].threshold).toBe(60);
  });

  it('seeds and clears the whole semester', async () => {
    store.loadSample();
    await settle();
    expect(store.modules()).toHaveLength(4);

    store.clearAll();
    await settle();
    expect(store.isEmpty()).toBe(true);
  });

  it('derives initials from the stored profile name', async () => {
    store.updateProfile({ name: 'Thandi Mokoena' });
    await settle();

    expect(store.initials()).toBe('TM');
    expect(store.profile().name).toBe('Thandi Mokoena');
  });

  it('surfaces a write failure without losing the current state', async () => {
    store.loadSample();
    await settle();

    modules.failNextWrite = true;
    store.removeModule(store.modules()[0].id);
    await settle();

    expect(store.error()).toContain('permission');
    expect(store.modules()).toHaveLength(4);

    store.dismissError();
    expect(store.error()).toBeNull();
  });
});
