import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { DEFAULT_PREFERENCES, Module, Preferences } from '../domain/models';
import { ModulesRepository, PreferencesRepository } from './modules.repository';
import { byOrder, toModule, toPreferences } from './serialisation';

const MODULES_KEY = 'keepup.modules';
const PREFERENCES_KEY = 'keepup.preferences';

/**
 * On-device fallback used when Firebase is not configured, and during
 * server-side rendering where `localStorage` does not exist. Behaviour matches
 * the Firestore implementation so the rest of the app cannot tell them apart.
 */
abstract class LocalStore<T> {
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly streams = new Map<string, BehaviorSubject<T>>();

  protected abstract key(ownerId: string): string;
  protected abstract parse(raw: unknown): T;
  protected abstract empty(): T;

  protected stream(ownerId: string): BehaviorSubject<T> {
    let subject = this.streams.get(ownerId);
    if (!subject) {
      subject = new BehaviorSubject<T>(this.read(ownerId));
      this.streams.set(ownerId, subject);
    }
    return subject;
  }

  protected write(ownerId: string, value: T): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(this.key(ownerId), JSON.stringify(value));
      } catch {
        // Storage can be full or blocked; the in-memory stream still updates.
      }
    }
    this.stream(ownerId).next(value);
  }

  private read(ownerId: string): T {
    if (!this.isBrowser) return this.empty();
    try {
      const raw = localStorage.getItem(this.key(ownerId));
      return raw ? this.parse(JSON.parse(raw)) : this.empty();
    } catch {
      return this.empty();
    }
  }
}

@Injectable({ providedIn: 'root' })
export class LocalModulesRepository extends LocalStore<Module[]> implements ModulesRepository {
  watch(ownerId: string): Observable<Module[]> {
    return this.stream(ownerId).asObservable();
  }

  async save(ownerId: string, module: Module): Promise<void> {
    const current = this.stream(ownerId).value;
    const exists = current.some((candidate) => candidate.id === module.id);
    const next = exists
      ? current.map((candidate) => (candidate.id === module.id ? module : candidate))
      : [...current, module];
    this.write(ownerId, next.sort(byOrder));
  }

  async remove(ownerId: string, moduleId: string): Promise<void> {
    this.write(
      ownerId,
      this.stream(ownerId).value.filter((module) => module.id !== moduleId),
    );
  }

  async replaceAll(ownerId: string, modules: readonly Module[]): Promise<void> {
    this.write(ownerId, [...modules].sort(byOrder));
  }

  protected key(ownerId: string): string {
    return `${MODULES_KEY}.${ownerId}`;
  }

  protected parse(raw: unknown): Module[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) =>
        toModule(
          typeof (entry as { id?: unknown })?.id === 'string'
            ? (entry as { id: string }).id
            : `module-${index}`,
          entry,
        ),
      )
      .sort(byOrder);
  }

  protected empty(): Module[] {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class LocalPreferencesRepository
  extends LocalStore<Preferences>
  implements PreferencesRepository
{
  watch(ownerId: string): Observable<Preferences> {
    return this.stream(ownerId).asObservable();
  }

  async save(ownerId: string, preferences: Preferences): Promise<void> {
    this.write(ownerId, preferences);
  }

  protected key(ownerId: string): string {
    return `${PREFERENCES_KEY}.${ownerId}`;
  }

  protected parse(raw: unknown): Preferences {
    return toPreferences(raw);
  }

  protected empty(): Preferences {
    return DEFAULT_PREFERENCES;
  }
}
