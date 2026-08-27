import { inject, Injectable } from '@angular/core';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

/**
 * Holds the Firestore handle. Separate from `FirebaseService` so the Firestore
 * SDK is only reachable from the lazily loaded dashboard, and never ships with
 * the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly firebase = inject(FirebaseService);
  private instance: Firestore | null = null;

  get db(): Firestore {
    this.instance ??= getFirestore(this.firebase.app);
    return this.instance;
  }
}
