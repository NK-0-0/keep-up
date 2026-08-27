import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFailure } from './api-failure';
import { errorInterceptor } from './error.interceptor';
import { REQUEST_TIMEOUT_MS } from './http.context';
import { timeoutInterceptor } from './timeout.interceptor';
import { provideRouter } from '@angular/router';

describe('timeoutInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, timeoutInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abandons a hung request as a retryable 408', async () => {
    let failure: ApiFailure | undefined;
    http.get('/api/modules').subscribe({ error: (error) => (failure = error) });

    httpMock.expectOne('/api/modules');
    await vi.advanceTimersByTimeAsync(20_001);

    expect(failure?.status).toBe(408);
    expect(failure?.retryable).toBe(true);
    expect(failure?.message).toBe('The server took too long to respond. Please try again.');
  });

  it('leaves a request that answers in time alone', async () => {
    const onNext = vi.fn();
    http.get('/api/modules').subscribe({ next: onNext, error: () => {} });

    await vi.advanceTimersByTimeAsync(1_000);
    httpMock.expectOne('/api/modules').flush({ ok: true });

    expect(onNext).toHaveBeenCalledWith({ ok: true });
  });

  it('can be lifted for a known-slow endpoint', async () => {
    const onNext = vi.fn();
    const context = new HttpContext().set(REQUEST_TIMEOUT_MS, 0);
    http.get('/api/report', { context }).subscribe({ next: onNext, error: () => {} });

    const request = httpMock.expectOne('/api/report');
    await vi.advanceTimersByTimeAsync(60_000);
    request.flush({ ok: true });

    expect(onNext).toHaveBeenCalledWith({ ok: true });
  });
});
