import { inject, Provider } from '@angular/core';
import { FirebaseService } from '../core/firebase/firebase.service';
import {
  FirestoreModulesRepository,
  FirestorePreferencesRepository,
} from './firestore-modules.repository';
import { LocalModulesRepository, LocalPreferencesRepository } from './local-modules.repository';
import { ModulesRepository, PreferencesRepository } from './modules.repository';
import { KeepUpStore } from '../state/keep-up.store';

/**
 * Binds the repository abstractions to Firestore when Firebase is configured,
 * and to on-device storage otherwise, then provides the store on top of them.
 * The choice is made once, so nothing above this layer needs to know which
 * backing store is live.
 */
export function provideKeepUpData(): Provider[] {
  return [
    KeepUpStore,
    {
      provide: ModulesRepository,
      useFactory: () =>
        inject(FirebaseService).enabled
          ? inject(FirestoreModulesRepository)
          : inject(LocalModulesRepository),
    },
    {
      provide: PreferencesRepository,
      useFactory: () =>
        inject(FirebaseService).enabled
          ? inject(FirestorePreferencesRepository)
          : inject(LocalPreferencesRepository),
    },
  ];
}
