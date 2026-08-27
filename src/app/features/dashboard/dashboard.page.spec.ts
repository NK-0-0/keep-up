import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ModulesRepository, PreferencesRepository } from '../../data/modules.repository';
import { DEFAULT_PREFERENCES, Module, Preferences } from '../../domain/models';
import { KeepUpStore } from '../../state/keep-up.store';
import { provideUnconfiguredFirebase } from '../../../testing/firebase-testing';
import { DashboardPage } from './dashboard.page';

class StubModulesRepository extends ModulesRepository {
  readonly modules = new BehaviorSubject<Module[]>([]);

  watch(): Observable<Module[]> {
    return this.modules.asObservable();
  }

  async save(_ownerId: string, module: Module): Promise<void> {
    // Upsert, matching the real repositories — a save is used for both
    // creating a module and updating one in place.
    const current = this.modules.value;
    const exists = current.some((candidate) => candidate.id === module.id);
    this.modules.next(
      exists
        ? current.map((candidate) => (candidate.id === module.id ? module : candidate))
        : [...current, module],
    );
  }

  async remove(): Promise<void> {}

  async replaceAll(_ownerId: string, modules: readonly Module[]): Promise<void> {
    this.modules.next([...modules]);
  }
}

class StubPreferencesRepository extends PreferencesRepository {
  readonly preferences = new BehaviorSubject<Preferences>(DEFAULT_PREFERENCES);

  watch(): Observable<Preferences> {
    return this.preferences.asObservable();
  }

  async save(_ownerId: string, preferences: Preferences): Promise<void> {
    this.preferences.next(preferences);
  }
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let repository: StubModulesRepository;
  let preferences: StubPreferencesRepository;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function click(selector: string): void {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector)?.click();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    repository = new StubModulesRepository();
    preferences = new StubPreferencesRepository();

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [...provideUnconfiguredFirebase()],
    }).overrideComponent(DashboardPage, {
      set: {
        providers: [
          // Replaces the component's own `provideKeepUpData()` so the test never
          // reaches for Firebase, keeping the store it would have provided.
          KeepUpStore,
          { provide: ModulesRepository, useValue: repository },
          { provide: PreferencesRepository, useValue: preferences },
        ],
      },
    });

    fixture = TestBed.createComponent(DashboardPage);
    await settle();
  });

  it('shows the empty state before any module exists', () => {
    expect(text()).toContain('Nothing here yet');
    expect(text()).toContain('Let us set up your semester');
    expect(text()).toContain('Default DP bar');
  });

  it('seeds the sample semester from the empty state', async () => {
    click('.placeholder--empty button');
    await settle();

    expect(repository.modules.value).toHaveLength(4);
    expect(text()).toContain('CSC2601');
    expect(text()).toContain('DIDN’T MAKE DP'.replace('’', "'"));
  });

  it('adds a module through the inline form', async () => {
    click('.toolbar .ku-button--primary');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    const code = host.querySelector<HTMLInputElement>('.add-module__code')!;
    code.value = 'csc2601';
    code.dispatchEvent(new Event('input'));

    const title = host.querySelector<HTMLInputElement>('.add-module__title')!;
    title.value = 'Database Systems';
    title.dispatchEvent(new Event('input'));

    click('.add-module__submit');
    await settle();

    expect(repository.modules.value[0].code).toBe('CSC2601');
    expect(text()).toContain('Database Systems');
  });

  it('switches between the glance and detail layouts', async () => {
    click('.placeholder--empty button');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('ku-module-glance-card')).toHaveLength(4);

    host.querySelectorAll<HTMLElement>('.segmented__option')[1].click();
    await settle();

    expect(host.querySelectorAll('ku-module-detail-card')).toHaveLength(4);
    expect(text()).toContain('DP BAR FOR THIS MODULE');
  });

  it('renders a newly added module in the detail view with no assessments', async () => {
    click('.toolbar .ku-button--primary');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    const code = host.querySelector<HTMLInputElement>('.add-module__code')!;
    code.value = 'CSC2601';
    code.dispatchEvent(new Event('input'));
    click('.add-module__submit');
    await settle();

    host.querySelectorAll<HTMLElement>('.segmented__option')[1].click();
    await settle();

    // A module with no assessments takes the @empty branch, which is what the
    // detail card shows immediately after one is created.
    expect(host.querySelectorAll('ku-assessment-table')).toHaveLength(1);
    expect(host.querySelectorAll('.assessments__row')).toHaveLength(0);
    expect(text()).toContain('No assessments yet');
    // A module created seconds ago must not be reported as a lost cause.
    expect(text()).not.toContain("DIDN'T MAKE DP");
    expect(text()).toContain('IN PROGRESS');
    expect(text()).toContain('Add the assessments that count towards this module');
  });

  it('renames a module through the detail card', async () => {
    click('.placeholder--empty button');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelectorAll<HTMLElement>('.segmented__option')[1].click();
    await settle();

    // The pencil toggle swaps the heading for inputs.
    host.querySelector<HTMLElement>('ku-module-detail-card .ku-icon-button')!.click();
    await settle();

    const code = host.querySelector<HTMLInputElement>('.detail__field--code')!;
    code.value = 'inf2611';
    code.dispatchEvent(new Event('change'));
    await settle();

    expect(repository.modules.value[0].code).toBe('INF2611');
    expect(repository.modules.value[0].id).toBe('sample-csc2601');
  });

  it('renames an assessment through the detail card', async () => {
    click('.placeholder--empty button');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelectorAll<HTMLElement>('.segmented__option')[1].click();
    await settle();

    const name = host.querySelector<HTMLInputElement>('.assessments__name')!;
    name.value = 'Semester Test 1';
    name.dispatchEvent(new Event('change'));
    await settle();

    const [assessment] = repository.modules.value[0].assessments;
    expect(assessment.name).toBe('Semester Test 1');
    expect(assessment.weight).toBe(15);
  });

  it('updates the qualification and year from the profile card', async () => {
    click('.profile__controls .ku-button--ghost');
    await settle();

    const host = fixture.nativeElement as HTMLElement;
    for (const [label, value] of [
      ['Qualification', 'BSc Computer Science'],
      ['Year of study', '2nd year'],
    ]) {
      const field = host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
      field.value = value;
      field.dispatchEvent(new Event('change'));
      await settle();
    }

    expect(preferences.preferences.value.profile).toMatchObject({
      course: 'BSc Computer Science',
      year: '2nd year',
    });

    // Leaving edit mode shows the saved values back on the card.
    click('.profile__controls .ku-button--ghost');
    await settle();
    expect(text()).toContain('BSc Computer Science  ·  2nd year');
  });

  it('asks for confirmation before clearing everything', async () => {
    click('.placeholder--empty button');
    await settle();

    click('.footer .ku-button--danger');
    await settle();
    expect(repository.modules.value).toHaveLength(4);
    expect(text()).toContain('Yes, delete every module');

    click('.footer .ku-button--danger');
    await settle();
    expect(repository.modules.value).toHaveLength(0);
  });
});
