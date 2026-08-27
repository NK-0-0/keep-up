import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web config. These values are public identifiers rather than secrets —
 * access is controlled by Firestore security rules, not by hiding them. Replace
 * the placeholders with the config from your Firebase console
 * (Project settings → Your apps → Web app).
 *
 * While the placeholders are in place KeepUp runs in local-only mode: the same
 * UI and rules, backed by `localStorage` instead of Firestore.
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
    authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_PROJECT.appspot.com',
    messagingSenderId: 'REPLACE_WITH_SENDER_ID',
    appId: 'REPLACE_WITH_APP_ID',
  } satisfies FirebaseOptions,
};
