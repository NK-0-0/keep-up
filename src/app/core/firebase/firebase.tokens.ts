import { InjectionToken } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';
import { environment } from '../../../environments/environment';

/** Firebase web config, injectable so tests and alternate builds can swap it. */
export const FIREBASE_CONFIG = new InjectionToken<FirebaseOptions>('FIREBASE_CONFIG', {
  providedIn: 'root',
  factory: () => environment.firebase,
});

/** True once the placeholders in `environment.ts` have been filled in. */
export function isFirebaseConfigured(config: FirebaseOptions): boolean {
  const required = [config.apiKey, config.projectId, config.appId];
  return required.every((value) => !!value && !value.startsWith('REPLACE_WITH'));
}
