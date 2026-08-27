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
    apiKey: 'AIzaSyDZhB6ndXYDSAoQfrsolgWFdrRSbgrG6NE',
    authDomain: 'keep-up-e547f.firebaseapp.com',
    projectId: 'keep-up-e547f',
    storageBucket: 'keep-up-e547f.firebasestorage.app',
    messagingSenderId: '2543788048',
    appId: '1:2543788048:web:fa83b1e567b589e6962a95',
    measurementId: 'G-KL5W8G3PNT',
  },
};