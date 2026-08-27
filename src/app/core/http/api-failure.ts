import { HttpErrorResponse } from '@angular/common/http';

/**
 * A transport or server failure, normalised into something the UI can show and
 * calling code can branch on. Every error leaving the HTTP layer is one of
 * these rather than a raw `HttpErrorResponse`.
 */
export interface ApiFailure {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  /** Message safe to show a student. */
  readonly message: string;
  /** Machine-readable code from the API body, when it supplies one. */
  readonly code: string | null;
  readonly url: string | null;
  /** Whether retrying the same request could plausibly succeed. */
  readonly retryable: boolean;
  /** The original response, kept for logging. */
  readonly cause: HttpErrorResponse;
}

/** Statuses worth retrying: transport failures, timeouts, throttling, and 5xx. */
const RETRYABLE_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

export function toApiFailure(error: HttpErrorResponse): ApiFailure {
  return {
    status: error.status,
    message: describe(error),
    code: readCode(error.error),
    url: error.url,
    retryable: isRetryableStatus(error.status),
    cause: error,
  };
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === 'object' && value !== null && 'retryable' in value && 'status' in value;
}

/** Prefers the API's own message, falling back to copy keyed off the status. */
function describe(error: HttpErrorResponse): string {
  const supplied = readMessage(error.error);
  if (supplied) return supplied;

  switch (error.status) {
    case 0:
      return 'Could not reach the server. Check your connection and try again.';
    case 400:
      return 'That request was not valid. Check the details and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That change conflicts with a more recent one. Reload and try again.';
    case 413:
      return 'That is too large to upload.';
    case 422:
      return 'Some of those details were not accepted. Check them and try again.';
    case 429:
      return 'Too many requests. Wait a moment and try again.';
    case 503:
      return 'The service is temporarily unavailable. Try again shortly.';
    default:
      return error.status >= 500
        ? 'Something went wrong on our side. Try again shortly.'
        : 'Something went wrong. Please try again.';
  }
}

/** Reads a message from the common API error-body shapes, without trusting it blindly. */
function readMessage(body: unknown): string | null {
  if (typeof body === 'string') return body.trim() ? sanitise(body) : null;
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;
  const candidate = record['message'] ?? record['detail'] ?? record['title'];
  return typeof candidate === 'string' && candidate.trim() ? sanitise(candidate) : null;
}

function readCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;

  const code = (body as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : null;
}

/**
 * Server text is rendered as an interpolated string, never as HTML, but it is
 * still capped so a stack trace or HTML error page cannot fill the screen.
 */
function sanitise(message: string): string {
  const collapsed = message.replace(/\s+/g, ' ').trim();
  return collapsed.length > 200 ? `${collapsed.slice(0, 199)}…` : collapsed;
}
