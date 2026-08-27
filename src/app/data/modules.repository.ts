import { Observable } from 'rxjs';
import { Module, Preferences } from '../domain/models';

/**
 * Persistence boundary for modules. Implemented by Firestore in production and
 * by on-device storage when Firebase is not configured; nothing above this
 * layer knows which is in use.
 */
export abstract class ModulesRepository {
  /** Emits the owner's modules and every subsequent change. */
  abstract watch(ownerId: string): Observable<Module[]>;
  /** Creates or fully replaces a single module. */
  abstract save(ownerId: string, module: Module): Promise<void>;
  abstract remove(ownerId: string, moduleId: string): Promise<void>;
  /** Atomically replaces the whole collection — used for seeding and clearing. */
  abstract replaceAll(ownerId: string, modules: readonly Module[]): Promise<void>;
}

/** Persistence boundary for the profile and default DP bar. */
export abstract class PreferencesRepository {
  abstract watch(ownerId: string): Observable<Preferences>;
  abstract save(ownerId: string, preferences: Preferences): Promise<void>;
}
