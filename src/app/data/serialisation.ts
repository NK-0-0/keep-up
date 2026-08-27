import { Assessment, DEFAULT_THRESHOLD, Module, Preferences } from '../domain/models';
import { clampPercent, createId, normaliseMark } from '../domain/module-edits';

/**
 * Rehydrates a stored record into a `Module`. Stored data is untrusted — it may
 * predate a schema change or have been edited by hand — so every field is
 * defaulted rather than assumed.
 */
export function toModule(id: string, raw: unknown): Module {
  const data = (raw ?? {}) as Record<string, unknown>;
  const assessments = Array.isArray(data['assessments']) ? data['assessments'] : [];

  return {
    id,
    code: typeof data['code'] === 'string' ? data['code'] : 'NEW101',
    title: typeof data['title'] === 'string' ? data['title'] : 'Untitled module',
    threshold: typeof data['threshold'] === 'number' ? data['threshold'] : null,
    order: typeof data['order'] === 'number' ? data['order'] : 0,
    assessments: assessments.map(toAssessment),
  };
}

function toAssessment(raw: unknown): Assessment {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof data['id'] === 'string' ? data['id'] : createId(),
    name: typeof data['name'] === 'string' ? data['name'] : 'Assessment',
    weight: clampPercent(typeof data['weight'] === 'number' ? data['weight'] : 0),
    mark: normaliseMark(typeof data['mark'] === 'number' ? data['mark'] : null),
  };
}

/** Strips the client-side `id` — Firestore keeps it as the document key. */
export function toModuleDocument(module: Module): Record<string, unknown> {
  return {
    code: module.code,
    title: module.title,
    threshold: module.threshold,
    order: module.order,
    assessments: module.assessments.map((assessment) => ({ ...assessment })),
  };
}

export function toPreferences(raw: unknown): Preferences {
  const data = (raw ?? {}) as Record<string, unknown>;
  const profile = (data['profile'] ?? {}) as Record<string, unknown>;

  return {
    profile: {
      name: typeof profile['name'] === 'string' ? profile['name'] : '',
      course: typeof profile['course'] === 'string' ? profile['course'] : '',
      year: typeof profile['year'] === 'string' ? profile['year'] : '',
    },
    defaultThreshold:
      typeof data['defaultThreshold'] === 'number' ? data['defaultThreshold'] : DEFAULT_THRESHOLD,
  };
}

/** Stable ordering for the dashboard grid: explicit order, then code. */
export function byOrder(a: Module, b: Module): number {
  return a.order - b.order || a.code.localeCompare(b.code);
}
