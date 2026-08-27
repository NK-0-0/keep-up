import { inject, Injectable, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './firebase.tokens';

/**
 * Owns the Firebase app and auth handles. Everything is created lazily so the
 * SDK never runs during server-side rendering, and so an unconfigured project
 * degrades to local-only mode instead of throwing at bootstrap.
 *
 * Firestore deliberately lives in `FirestoreService` instead: it is only needed
 * once the dashboard loads, and keeping it out of here keeps that (large)
 * bundle off the sign-in path.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly config = inject(FIREBASE_CONFIG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Whether Firebase-backed auth and persistence are available in this context. */
  readonly enabled = this.isBrowser && isFirebaseConfigured(this.config);

  private appRef: FirebaseApp | null = null;
  private authRef: Auth | null = null;

  constructor() {
    // Which backend is live is the first thing you need to know when data is
    // not turning up where you expect it, and it is otherwise invisible.
    if (!this.isBrowser || !isDevMode()) return;

    if (this.enabled) {
      console.info(`[KeepUp] Data backend: Firestore, project "${this.config.projectId}".`);
    } else {
      console.warn(
        '[KeepUp] Data backend: on-device localStorage. Firebase is not configured, ' +
          'so nothing will be written to Firestore. Fill in src/environments/environment.ts.',
      );
    }
  }

  get app(): FirebaseApp {
    this.assertEnabled();
    this.appRef ??= getApps().length ? getApp() : initializeApp(this.config);
    return this.appRef;
  }

  get auth(): Auth {
    this.authRef ??= getAuth(this.app);
    return this.authRef;
  }

  /** Fails loudly rather than silently no-op'ing when Firebase is unavailable. */
  private assertEnabled(): void {
    if (this.enabled) return;
    throw new Error(
      this.isBrowser
        ? 'Firebase is not configured. Fill in src/environments/environment.ts.'
        : 'Firebase is browser-only and cannot be used during server-side rendering.',
    );
  }
}
