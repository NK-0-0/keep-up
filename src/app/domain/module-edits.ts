import { Assessment, MAX_THRESHOLD, MIN_THRESHOLD, Module } from './models';

/** Generates a client-side id, matching the shape Firestore accepts as a document id. */
export function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `x${Math.random().toString(36).slice(2, 11)}`;
}

/** Parses user input into a number, returning `null` for anything unusable. */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampPercent(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Coerces threshold input to a whole percentage inside the allowed range. */
export function clampThreshold(
  value: string | number | null | undefined,
  fallback: number,
): number {
  const parsed = parseNumber(value);
  if (parsed === null) return fallback;
  return Math.round(clampPercent(parsed, MIN_THRESHOLD, MAX_THRESHOLD));
}

export function createModule(code: string, title: string, order: number): Module {
  return {
    id: createId(),
    code: (code.trim() || 'NEW101').toUpperCase(),
    title: title.trim() || 'Untitled module',
    threshold: null,
    assessments: [],
    order,
  };
}

export function createAssessment(
  name: string,
  weight: string | number | null,
  mark: string | number | null,
): Assessment {
  return {
    id: createId(),
    name: String(name).trim() || 'Assessment',
    weight: clampPercent(parseNumber(weight) ?? 0),
    mark: normaliseMark(mark),
  };
}

/** An empty mark means "not written yet", which is distinct from a mark of 0. */
export function normaliseMark(value: string | number | null | undefined): number | null {
  const parsed = parseNumber(typeof value === 'string' ? value.trim() : value);
  return parsed === null ? null : clampPercent(parsed);
}

/**
 * Applies an edit to a module's identity. A field left blank keeps its previous
 * value — clearing the box should not wipe the module's name.
 */
export function renameModule(
  module: Module,
  changes: { readonly code?: string; readonly title?: string },
): Module {
  return {
    ...module,
    code: changes.code === undefined ? module.code : normaliseCode(changes.code, module.code),
    title: changes.title === undefined ? module.title : normaliseText(changes.title, module.title),
  };
}

export function normaliseCode(value: string, fallback: string): string {
  return value.trim().toUpperCase() || fallback;
}

export function normaliseText(value: string, fallback: string): string {
  return value.trim() || fallback;
}

export function addAssessment(module: Module, assessment: Assessment): Module {
  return { ...module, assessments: [...module.assessments, assessment] };
}

export function updateAssessment(
  module: Module,
  assessmentId: string,
  changes: Partial<Omit<Assessment, 'id'>>,
): Module {
  return {
    ...module,
    assessments: module.assessments.map((assessment) =>
      assessment.id === assessmentId ? { ...assessment, ...changes } : assessment,
    ),
  };
}

export function removeAssessment(module: Module, assessmentId: string): Module {
  return {
    ...module,
    assessments: module.assessments.filter((assessment) => assessment.id !== assessmentId),
  };
}
