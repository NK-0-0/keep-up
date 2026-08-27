import { Provider } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';
import { FIREBASE_CONFIG } from '../app/core/firebase/firebase.tokens';

/**
 * Pins unit tests to local mode.
 *
 * `FirebaseService.enabled` is derived from the environment file, so without
 * this a suite would behave differently depending on whether the developer
 * running it had filled in their Firebase config — passing on a fresh clone and
 * failing once credentials were added. Overriding the config token keeps the
 * real `AuthService` and its local-mode path under test, deterministically, and
 * guarantees no test ever reaches the network.
 */
export function provideUnconfiguredFirebase(): Provider[] {
  return [{ provide: FIREBASE_CONFIG, useValue: {} as FirebaseOptions }];
}
