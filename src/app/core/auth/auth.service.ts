import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { FirebaseService } from '../firebase/firebase.service';
import { AuthStatus, AuthUser, LOCAL_OWNER_ID } from './auth.models';

/** Popup failures that are worth retrying as a full-page redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

/**
 * Wraps Firebase Authentication (Google OAuth) behind a signal API, so
 * components never touch the SDK directly.
 *
 * This is the only place that knows how a session is established. Guards read
 * {@link canAccessData}, the data layer partitions by {@link ownerId}, and the
 * HTTP layer calls {@link getIdToken} to authenticate API requests.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FirebaseService);

  private readonly userState = signal<AuthUser | null>(null);
  private readonly statusState = signal<AuthStatus>(this.firebase.enabled ? 'pending' : 'local');
  private readonly errorState = signal<string | null>(null);
  private readonly busyState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  /** True once the session has been restored (or ruled out). */
  readonly ready = computed(() => this.statusState() !== 'pending');

  /** Whether the current context may read and write data. */
  readonly canAccessData = computed(
    () => this.statusState() === 'signed-in' || this.statusState() === 'local',
  );

  /**
   * Key the data layer partitions by: the Firebase uid when signed in, or a
   * fixed local key when running without Firebase. `null` while unresolved.
   */
  readonly ownerId = computed(() => {
    if (this.statusState() === 'local') return LOCAL_OWNER_ID;
    return this.userState()?.uid ?? null;
  });

  private resolveReady!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    if (!this.firebase.enabled) {
      this.resolveReady();
      return;
    }

    const destroyRef = inject(DestroyRef);
    const auth = this.firebase.auth;

    // Sessions survive a browser restart; this is the SDK default, set
    // explicitly so it is a decision rather than an accident.
    void setPersistence(auth, browserLocalPersistence).catch(() => {
      // Private-mode browsers can refuse local persistence. The session still
      // works for this tab, so this is not worth failing sign-in over.
    });

    // Completes a sign-in that used the redirect fallback. `onAuthStateChanged`
    // reports the resulting user, so only the failure path needs handling here.
    void getRedirectResult(auth).catch((error) => this.errorState.set(describeAuthError(error)));

    const stopAuthState = onAuthStateChanged(
      auth,
      (user) => {
        this.userState.set(user ? toAuthUser(user) : null);
        this.statusState.set(user ? 'signed-in' : 'signed-out');
        this.resolveReady();
      },
      (error) => {
        this.errorState.set(describeAuthError(error));
        this.statusState.set('signed-out');
        this.resolveReady();
      },
    );

    // Fires on token refresh as well as sign-in, keeping the exposed user in
    // step with the token the HTTP layer will attach.
    const stopIdToken = onIdTokenChanged(auth, (user) => {
      if (user) this.userState.set(toAuthUser(user));
    });

    destroyRef.onDestroy(() => {
      stopAuthState();
      stopIdToken();
    });
  }

  /** Resolves once the persisted session has been restored. */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Current Firebase ID token, or `null` when there is no session. Firebase
   * refreshes the token automatically and returns a cached one until it is
   * close to expiry, so this is cheap enough to call per request.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!this.firebase.enabled) return null;

    const user = this.firebase.auth.currentUser;
    if (!user) return null;

    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      // A revoked or unrefreshable token is not fatal here: the request goes
      // out unauthenticated and the API answers 401, which the error
      // interceptor turns into a sign-out.
      return null;
    }
  }

  /**
   * Starts Google sign-in. Uses a popup, falling back to a full-page redirect
   * where popups are unavailable. Resolves once the session is established (or
   * has failed); with the redirect fallback the page navigates away instead.
   */
  async signInWithGoogle(): Promise<void> {
    if (!this.firebase.enabled) return;

    this.errorState.set(null);
    this.busyState.set(true);
    try {
      await signInWithPopup(this.firebase.auth, buildProvider());
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? '';
      if (REDIRECT_FALLBACK_CODES.has(code)) {
        await this.signInWithRedirectFallback();
        return;
      }
      this.errorState.set(describeAuthError(error));
    } finally {
      this.busyState.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (!this.firebase.enabled) return;

    this.errorState.set(null);
    await signOut(this.firebase.auth);
  }

  private async signInWithRedirectFallback(): Promise<void> {
    try {
      await signInWithRedirect(this.firebase.auth, buildProvider());
    } catch (error) {
      this.errorState.set(describeAuthError(error));
    }
  }
}

function buildProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Always let the student pick an account rather than silently reusing one.
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Google. Check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised in the Firebase console.';
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered with a different sign-in method.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return (error as Error | null)?.message ?? 'Sign-in failed. Please try again.';
  }
}
