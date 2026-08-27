import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

/**
 * Holds the Firestore handle. Separate from `FirebaseService` so the Firestore
 * SDK is only reachable from the lazily loaded dashboard, and never ships with
 * the initial bundle.
 *
 * Configured with a persistent local cache, which matters for this app in
 * particular: students enter marks on phones with patchy campus wifi. Writes
 * are applied to the cache immediately and queued for the server, so the UI
 * responds at once and nothing is lost when the connection drops.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly firebase = inject(FirebaseService);
  private instance: Firestore | null = null;

  get db(): Firestore {
    this.instance ??= this.connect();
    return this.instance;
  }

  private connect(): Firestore {
    try {
      return initializeFirestore(this.firebase.app, {
        localCache: persistentLocalCache({
          // Several open tabs of the same dashboard is a normal thing for a
          // student to do; without this only the first would get persistence.
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // IndexedDB is unavailable (private browsing, or a browser that blocks
      // it), or Firestore was already initialised. Fall back to the in-memory
      // default — everything still works, just without offline support.
      return getFirestore(this.firebase.app);
    }
  }
}
