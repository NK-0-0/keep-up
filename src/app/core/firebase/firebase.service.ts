import { inject, Injectable, PLATFORM_ID } from '@angular/core';
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
