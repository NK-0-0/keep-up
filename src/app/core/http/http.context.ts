import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Per-request switches for the interceptor chain. Defaults are the common case,
 * so a plain `http.get(...)` gets the full treatment and callers opt out only
 * where they mean to.
 */

/** Suppresses the toast the error interceptor would otherwise raise. */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

/** Sends the request without an `Authorization` header. */
export const SKIP_AUTH_TOKEN = new HttpContextToken<boolean>(() => false);

/** Keeps the request out of the global loading indicator (polling, prefetch). */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** How many times a transient failure may be retried. Zero disables retries. */
export const MAX_RETRIES = new HttpContextToken<number>(() => 2);

/**
 * How long a single attempt may take before it is abandoned as a 408. Raise it
 * for a known-slow endpoint (a report, an upload); zero disables the timeout.
 */
export const REQUEST_TIMEOUT_MS = new HttpContextToken<number>(() => 20_000);

/**
 * Builds a context for a request the student should not see fail — a background
 * poll, or one whose error the caller handles itself.
 */
export function backgroundRequest(context = new HttpContext()): HttpContext {
  return context.set(SKIP_ERROR_NOTIFICATION, true).set(SKIP_LOADING, true);
}
