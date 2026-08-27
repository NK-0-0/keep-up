import { InjectionToken } from '@angular/core';

/**
 * Origin of the app's own API, e.g. `https://api.keepup.app`. Left empty for a
 * same-origin backend, which is the common case behind a reverse proxy.
 *
 * Only requests resolving to this origin (or to a same-origin relative path)
 * ever receive the student's Firebase ID token.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});

/** Path prefix that marks a request as belonging to the app's own API. */
export const API_PATH_PREFIX = '/api';
