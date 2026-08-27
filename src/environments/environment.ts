import { Environment } from './environment.model';

/**
 * Production environment — the default. `ng build` uses this file as-is;
 * `ng serve` and `ng build --configuration development` swap in
 * `environment.development.ts` via `fileReplacements` in `angular.json`.
 *
 * While the `REPLACE_WITH_…` placeholders are in place KeepUp runs in local-only
 * mode: the same UI and rules, backed by `localStorage` instead of Firestore.
 *
 * See `environment.model.ts` for why these values are safe to commit.
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: '',
  firebase: {
    apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
    authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_PROJECT.appspot.com',
    messagingSenderId: 'REPLACE_WITH_SENDER_ID',
    appId: 'REPLACE_WITH_APP_ID',
  },
};
