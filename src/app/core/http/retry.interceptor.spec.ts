import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RETRIES } from './http.context';
import { retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  /** Longer than the largest backoff the interceptor can choose. */
  const BEYOND_ANY_BACKOFF_MS = 20_000;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fail(status: number, headers?: Record<string, string>): void {
    httpMock
      .expectOne('/api/modules')
      .flush(null, { status, statusText: 'Failure', headers: headers ?? {} });
  }

  it('retries a transient failure and resolves with the eventual success', async () => {
    const onNext = vi.fn();
    http.get('/api/modules').subscribe({ next: onNext, error: () => {} });

    fail(503);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);

    httpMock.expectOne('/api/modules').flush({ ok: true });
    expect(onNext).toHaveBeenCalledWith({ ok: true });
  });

  it('gives up after the configured number of attempts', async () => {
    const onError = vi.fn();
    http.get('/api/modules').subscribe({ error: onError });

    // One original attempt plus two retries.
    fail(500);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);
    fail(500);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);
    fail(500);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);

    expect(onError).toHaveBeenCalledOnce();
    httpMock.verify();
  });

  it('does not retry a client error', async () => {
    const onError = vi.fn();
    http.get('/api/modules').subscribe({ error: onError });

    fail(400);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);

    expect(onError).toHaveBeenCalledOnce();
    httpMock.verify();
  });

  it('does not replay a POST, which may already have been applied', async () => {
    const onError = vi.fn();
    http.post('/api/modules', {}).subscribe({ error: onError });

    httpMock.expectOne('/api/modules').flush(null, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);

    expect(onError).toHaveBeenCalledOnce();
    httpMock.verify();
  });

  it('waits for the interval the server asks for in Retry-After', async () => {
    http.get('/api/modules').subscribe({ error: () => {} });

    fail(429, { 'Retry-After': '2' });

    await vi.advanceTimersByTimeAsync(1_500);
    httpMock.expectNone('/api/modules');

    await vi.advanceTimersByTimeAsync(1_000);
    httpMock.expectOne('/api/modules').flush({ ok: true });
  });

  it('can be switched off per request', async () => {
    const onError = vi.fn();
    const context = new HttpContext().set(MAX_RETRIES, 0);
    http.get('/api/modules', { context }).subscribe({ error: onError });

    fail(503);
    await vi.advanceTimersByTimeAsync(BEYOND_ANY_BACKOFF_MS);

    expect(onError).toHaveBeenCalledOnce();
    httpMock.verify();
  });
});
