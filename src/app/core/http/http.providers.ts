import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { apiUrlInterceptor } from './api-url.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';
import { correlationIdInterceptor } from './correlation-id.interceptor';
import { errorInterceptor } from './error.interceptor';
import { loadingInterceptor } from './loading.interceptor';
import { retryInterceptor } from './retry.interceptor';
import { timeoutInterceptor } from './timeout.interceptor';

/**
 * `HttpClient` plus the app's interceptor chain.
 *
 * Order matters, and it is the outbound order: a request passes through the
 * list top to bottom, and the response comes back bottom to top.
 *
 * 1. `apiUrl`        — resolve `/api/...` first, so everything below sees the final URL.
 * 2. `loading`       — count the logical request once, not once per retry.
 * 3. `error`         — outside retry, so only the final failure is reported.
 * 4. `correlationId` — one id shared by every attempt at the same request.
 * 5. `retry`         — replay transient failures for safe methods.
 * 6. `timeout`       — inside retry, so the budget applies per attempt.
 * 7. `authToken`     — inside retry, so each attempt gets a fresh token.
 *
 * Note that the Firebase SDK does not use `HttpClient`; none of this applies to
 * its auth or Firestore traffic.
 */
export function provideKeepUpHttp(): EnvironmentProviders {
  return provideHttpClient(
    withFetch(),
    withInterceptors([
      apiUrlInterceptor,
      loadingInterceptor,
      errorInterceptor,
      correlationIdInterceptor,
      retryInterceptor,
      timeoutInterceptor,
      authTokenInterceptor,
    ]),
  );
}
