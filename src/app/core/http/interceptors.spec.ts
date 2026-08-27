import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';
import { ApiFailure, isApiFailure } from './api-failure';
import { apiUrlInterceptor } from './api-url.interceptor';
import { API_BASE_URL } from './api.tokens';
import { authTokenInterceptor } from './auth-token.interceptor';
import { CORRELATION_ID_HEADER, correlationIdInterceptor } from './correlation-id.interceptor';
import { errorInterceptor } from './error.interceptor';
import { SKIP_AUTH_TOKEN, SKIP_ERROR_NOTIFICATION, SKIP_LOADING } from './http.context';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from './loading.service';

const TOKEN = 'firebase-id-token';

class StubAuthService {
  token: string | null = TOKEN;
  readonly signOut = vi.fn(async () => {});

  async getIdToken(): Promise<string | null> {
    return this.token;
  }
}

describe('HTTP interceptor chain', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: StubAuthService;
  let notifications: NotificationService;
  let loading: LoadingService;
  let router: Router;

  function configure(baseUrl = ''): void {
    // Tests that need a different API origin reconfigure mid-test, which means
    // tearing the previous injector down first.
    TestBed.resetTestingModule();
    auth = new StubAuthService();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([
            apiUrlInterceptor,
            loadingInterceptor,
            errorInterceptor,
            correlationIdInterceptor,
            authTokenInterceptor,
          ]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    loading = TestBed.inject(LoadingService);
    router = TestBed.inject(Router);
  }

  /** The auth interceptor awaits a token, so the request is issued a tick late. */
  async function expectOne(url: string): Promise<TestRequest> {
    await Promise.resolve();
    return httpMock.expectOne(url);
  }

  beforeEach(() => configure());

  describe('apiUrlInterceptor', () => {
    it('leaves relative paths alone when no base URL is configured', async () => {
      http.get('/api/modules').subscribe();

      (await expectOne('/api/modules')).flush({});
      httpMock.verify();
    });

    it('expands /api paths against the configured origin', async () => {
      configure('https://api.keepup.test/');
      http.get('/api/modules').subscribe();

      (await expectOne('https://api.keepup.test/api/modules')).flush({});
      httpMock.verify();
    });

    it('does not touch absolute third-party URLs', async () => {
      configure('https://api.keepup.test');
      http.get('https://example.test/data').subscribe();

      (await expectOne('https://example.test/data')).flush({});
      httpMock.verify();
    });
  });

  describe('authTokenInterceptor', () => {
    it('attaches the Firebase ID token to the app API', async () => {
      http.get('/api/modules').subscribe();

      const request = await expectOne('/api/modules');
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      request.flush({});
    });

    it('never sends the token to a third-party host', async () => {
      http.get('https://example.test/data').subscribe();

      const request = await expectOne('https://example.test/data');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('does not match a lookalike host that merely starts with the base URL', async () => {
      configure('https://api.keepup.test');
      http.get('https://api.keepup.test.attacker.test/api/modules').subscribe();

      const request = await expectOne('https://api.keepup.test.attacker.test/api/modules');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('honours SKIP_AUTH_TOKEN', async () => {
      const context = new HttpContext().set(SKIP_AUTH_TOKEN, true);
      http.get('/api/modules', { context }).subscribe();

      const request = await expectOne('/api/modules');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('sends the request unauthenticated when there is no session', async () => {
      auth.token = null;
      http.get('/api/modules').subscribe();

      const request = await expectOne('/api/modules');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });
  });

  describe('correlationIdInterceptor', () => {
    it('tags app API requests', async () => {
      http.get('/api/modules').subscribe();

      const request = await expectOne('/api/modules');
      expect(request.request.headers.get(CORRELATION_ID_HEADER)).toBeTruthy();
      request.flush({});
    });

    it('leaves third-party requests untagged, avoiding a needless preflight', async () => {
      http.get('https://example.test/data').subscribe();

      const request = await expectOne('https://example.test/data');
      expect(request.request.headers.has(CORRELATION_ID_HEADER)).toBe(false);
      request.flush({});
    });
  });

  describe('errorInterceptor', () => {
    it('normalises the failure and raises one notification', async () => {
      let failure: ApiFailure | undefined;
      http.get('/api/modules').subscribe({ error: (error) => (failure = error) });

      (await expectOne('/api/modules')).flush(
        { message: 'Module not found' },
        { status: 404, statusText: 'Not Found' },
      );

      expect(isApiFailure(failure)).toBe(true);
      expect(failure?.status).toBe(404);
      expect(failure?.message).toBe('Module not found');
      expect(failure?.retryable).toBe(false);
      expect(notifications.notifications()).toHaveLength(1);
    });

    it('falls back to status-based copy when the body has no message', async () => {
      let failure: ApiFailure | undefined;
      http.get('/api/modules').subscribe({ error: (error) => (failure = error) });

      (await expectOne('/api/modules')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(failure?.message).toBe('Something went wrong on our side. Try again shortly.');
      expect(failure?.retryable).toBe(true);
    });

    it('honours SKIP_ERROR_NOTIFICATION but still reports the failure', async () => {
      const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
      let failure: ApiFailure | undefined;
      http.get('/api/modules', { context }).subscribe({ error: (error) => (failure = error) });

      (await expectOne('/api/modules')).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(failure?.status).toBe(403);
      expect(notifications.notifications()).toHaveLength(0);
    });

    it('collapses identical messages from a burst of failures', async () => {
      http.get('/api/modules').subscribe({ error: () => {} });
      (await expectOne('/api/modules')).flush(null, { status: 500, statusText: 'Server Error' });

      http.get('/api/modules').subscribe({ error: () => {} });
      (await expectOne('/api/modules')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(notifications.notifications()).toHaveLength(1);
    });

    it('signs the student out and returns them to sign-in on a 401', async () => {
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      http.get('/api/modules').subscribe({ error: () => {} });
      (await expectOne('/api/modules')).flush(null, { status: 401, statusText: 'Unauthorized' });
      await Promise.resolve();
      await Promise.resolve();

      expect(auth.signOut).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/sign-in'], { queryParams: {} });
    });
  });

  describe('loadingInterceptor', () => {
    it('counts a request in flight and clears it on success', async () => {
      http.get('/api/modules').subscribe();
      const request = await expectOne('/api/modules');

      expect(loading.isLoading()).toBe(true);
      request.flush({});
      expect(loading.isLoading()).toBe(false);
    });

    it('clears the counter when the request fails', async () => {
      http.get('/api/modules').subscribe({ error: () => {} });
      const request = await expectOne('/api/modules');

      request.flush(null, { status: 500, statusText: 'Server Error' });
      expect(loading.isLoading()).toBe(false);
    });

    it('does not count a request that opted out', async () => {
      const context = new HttpContext().set(SKIP_LOADING, true);
      http.get('/api/modules', { context }).subscribe();
      const request = await expectOne('/api/modules');

      expect(loading.isLoading()).toBe(false);
      request.flush({});
    });
  });
});
