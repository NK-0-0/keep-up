/** The subset of the Firebase user record KeepUp actually uses. */
export interface AuthUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly photoURL: string | null;
}

export type AuthStatus =
  /** Waiting for Firebase to restore any persisted session. */
  | 'pending'
  | 'signed-in'
  | 'signed-out'
  /** Firebase is not configured — data lives on this device only. */
  | 'local';

/** Owner id used for the on-device store when Firebase is not configured. */
export const LOCAL_OWNER_ID = 'local';
