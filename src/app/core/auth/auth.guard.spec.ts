import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { authGuard, guestGuard, safeReturnUrl } from './auth.guard';
import { AuthService } from './auth.service';

class StubAuthService {
  accessible = false;
  /** Resolves the ready promise, optionally flipping access as it settles. */
  private release: (() => void) | null = null;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.release = resolve;
  });

  canAccessData(): boolean {
    return this.accessible;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  settle(accessible: boolean): void {
    this.accessible = accessible;
    this.release?.();
  }
}

describe('safeReturnUrl', () => {
  it('keeps an in-app path', () => {
    expect(safeReturnUrl('/modules?view=detail')).toBe('/modules?view=detail');
  });

  it('falls back to the dashboard when there is nothing to return to', () => {
    expect(safeReturnUrl(null)).toBe('/');
    expect(safeReturnUrl('')).toBe('/');
  });

  it('rejects anything that would leave the app', () => {
    expect(safeReturnUrl('https://attacker.test')).toBe('/');
    expect(safeReturnUrl('//attacker.test')).toBe('/');
    expect(safeReturnUrl('\\\\attacker.test')).toBe('/');
    expect(safeReturnUrl('/\\attacker.test')).toBe('/');
    expect(safeReturnUrl('javascript:alert(1)')).toBe('/');
  });
});

describe('auth guards', () => {
  let auth: StubAuthService;
  let router: Router;

  function state(url: string): RouterStateSnapshot {
    return { url } as RouterStateSnapshot;
  }

  function route(queryParams: Record<string, string> = {}): ActivatedRouteSnapshot {
    return { queryParamMap: convertToParamMap(queryParams) } as ActivatedRouteSnapshot;
  }

  function runAuthGuard(url: string): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () => authGuard(route(), state(url)) as Promise<boolean | UrlTree>,
    );
  }

  function runGuestGuard(queryParams: Record<string, string> = {}): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () => guestGuard(route(queryParams), state('/sign-in')) as Promise<boolean | UrlTree>,
    );
  }

  beforeEach(() => {
    auth = new StubAuthService();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('waits for the session to resolve before deciding', async () => {
      const decision = runAuthGuard('/');

      // Access is still false at this point; the guard must not have answered.
      auth.settle(true);

      expect(await decision).toBe(true);
    });

    it('redirects to sign-in, remembering where the student was headed', async () => {
      const decision = runAuthGuard('/modules?view=detail');
      auth.settle(false);

      const result = await decision;
      expect(result).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(result as UrlTree)).toBe(
        '/sign-in?returnUrl=%2Fmodules%3Fview%3Ddetail',
      );
    });

    it('does not add a returnUrl for the dashboard itself', async () => {
      const decision = runAuthGuard('/');
      auth.settle(false);

      expect(router.serializeUrl((await decision) as UrlTree)).toBe('/sign-in');
    });
  });

  describe('guestGuard', () => {
    it('lets a signed-out student reach the sign-in page', async () => {
      const decision = runGuestGuard();
      auth.settle(false);

      expect(await decision).toBe(true);
    });

    it('returns a signed-in student to where they were headed', async () => {
      const decision = runGuestGuard({ returnUrl: '/modules' });
      auth.settle(true);

      expect(router.serializeUrl((await decision) as UrlTree)).toBe('/modules');
    });

    it('ignores an off-site returnUrl', async () => {
      const decision = runGuestGuard({ returnUrl: 'https://attacker.test' });
      auth.settle(true);

      expect(router.serializeUrl((await decision) as UrlTree)).toBe('/');
    });
  });
});
