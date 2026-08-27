import type { FirebaseOptions } from 'firebase/app';

/**
 * Shape every environment file must satisfy. Typing both files against this
 * catches drift — a key added to one and forgotten in the other fails the build
 * rather than surfacing as `undefined` at runtime.
 */
export interface Environment {
  readonly production: boolean;

  /**
   * Origin of the app's own API, e.g. `https://api.keepup.app`. Empty means
   * same-origin, which is the common case behind a reverse proxy.
   */
  readonly apiBaseUrl: string;

  /**
   * Firebase web config.
   *
   * These are public identifiers, not secrets: they ship inside the JavaScript
   * bundle no matter where they are declared, and access is enforced by the
   * Firestore rules and Firebase Auth rather than by hiding them. Committing
   * them is the documented Firebase pattern.
   *
   * Harden the project in the console instead — API key HTTP-referrer
   * restrictions, authorised domains, and App Check. Never put a genuine secret
   * (a service account key, a private API token) in these files.
   */
  readonly firebase: FirebaseOptions;
}
