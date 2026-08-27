import { Environment } from './environment.model';

/**
 * Development environment, used by `ng serve` and
 * `ng build --configuration development`.
 *
 * Point this at a separate Firebase project from production, so local
 * experiments and seeded sample data never touch real students' marks.
 *
 * See `environment.model.ts` for why these values are safe to commit.
 */
export const environment: Environment = {
  production: false,
  apiBaseUrl: '',
  firebase: {
    apiKey: 'AIzaSyDZhB6ndXYDSAoQfrsolgWFdrRSbgrG6NE',
    authDomain: 'keep-up-e547f.firebaseapp.com',
    projectId: 'keep-up-e547f',
    storageBucket: 'keep-up-e547f.firebasestorage.app',
    messagingSenderId: '2543788048',
    appId: '1:2543788048:web:ad855c1719e59edb962a95',
    measurementId: "G-M3VRLTM14J"
  },
};