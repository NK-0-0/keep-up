import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ModulesRepository, PreferencesRepository } from '../../data/modules.repository';
import { DEFAULT_PREFERENCES, Module, Preferences } from '../../domain/models';
import { KeepUpStore } from '../../state/keep-up.store';
import { DashboardPage } from './dashboard.page';

class StubModulesRepository extends ModulesRepository {
  readonly modules = new BehaviorSubject<Module[]>([]);

  watch(): Observable<Module[]> {
    return this.modules.asObservable();
  }

  async save(_ownerId: string, module: Module): Promise<void> {
    this.modules.next([...this.modules.value, module]);
  }

  async remove(): Promise<void> {}

  async replaceAll(_ownerId: string, modules: readonly Module[]): Promise<void> {
    this.modules.next([...modules]);
  }
}

class StubPreferencesRepository extends PreferencesRepository {
  watch(): Observable<Preferences> {
    return of(DEFAULT_PREFERENCES);
  }

  async save(): Promise<void> {}
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let repository: StubModulesRepository;

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

    TestBed.configureTestingModule({ imports: [DashboardPage] }).overrideComponent(DashboardPage, {
      set: {
        providers: [
          // Replaces the component's own `provideKeepUpData()` so the test never
          // reaches for Firebase, keeping the store it would have provided.
          KeepUpStore,
          { provide: ModulesRepository, useValue: repository },
          { provide: PreferencesRepository, useClass: StubPreferencesRepository },
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
