import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from '../core/firebase/firestore.service';
import { Module, Preferences } from '../domain/models';
import { ModulesRepository, PreferencesRepository } from './modules.repository';
import { toModule, toModuleDocument, toPreferences } from './serialisation';

/** Document holding one student's profile and settings. */
const USERS = 'users';
/** Sub-collection of that document holding their modules. */
const MODULES = 'modules';

@Injectable({ providedIn: 'root' })
export class FirestoreModulesRepository extends ModulesRepository {
  private readonly firestore = inject(FirestoreService);

  watch(ownerId: string): Observable<Module[]> {
    return new Observable<Module[]>((subscriber) =>
      onSnapshot(
        query(this.modules(ownerId), orderBy('order')),
        (snapshot) =>
          subscriber.next(snapshot.docs.map((document) => toModule(document.id, document.data()))),
        (error) => subscriber.error(error),
      ),
    );
  }

  async save(ownerId: string, module: Module): Promise<void> {
    await setDoc(doc(this.modules(ownerId), module.id), toModuleDocument(module));
  }

  async remove(ownerId: string, moduleId: string): Promise<void> {
    await deleteDoc(doc(this.modules(ownerId), moduleId));
  }

  async replaceAll(ownerId: string, modules: readonly Module[]): Promise<void> {
    const collectionRef = this.modules(ownerId);
    const existing = await getDocs(collectionRef);
    const keep = new Set(modules.map((module) => module.id));
    const batch = writeBatch(this.firestore.db);

    for (const document of existing.docs) {
      if (!keep.has(document.id)) batch.delete(document.ref);
    }
    for (const module of modules) {
      batch.set(doc(collectionRef, module.id), toModuleDocument(module));
    }

    await batch.commit();
  }

  private modules(ownerId: string) {
    return collection(this.firestore.db, USERS, ownerId, MODULES);
  }
}

@Injectable({ providedIn: 'root' })
export class FirestorePreferencesRepository extends PreferencesRepository {
  private readonly firestore = inject(FirestoreService);

  watch(ownerId: string): Observable<Preferences> {
    return new Observable<Preferences>((subscriber) =>
      onSnapshot(
        this.userDoc(ownerId),
        (snapshot) => subscriber.next(toPreferences(snapshot.data())),
        (error) => subscriber.error(error),
      ),
    );
  }

  async save(ownerId: string, preferences: Preferences): Promise<void> {
    // Merge so a future field written elsewhere on the user document survives.
    await setDoc(this.userDoc(ownerId), { ...preferences }, { merge: true });
  }

  private userDoc(ownerId: string) {
    return doc(this.firestore.db, USERS, ownerId);
  }
}
