/** A single piece of assessed work that contributes to a module's semester mark. */
export interface Assessment {
  readonly id: string;
  /** Display name, e.g. "Test 1". */
  readonly name: string;
  /** Contribution to the semester mark, as a percentage of the module (0–100). */
  readonly weight: number;
  /** Mark achieved as a percentage (0–100), or `null` when it has not been written yet. */
  readonly mark: number | null;
}

/** A module (course) the student is registered for. */
export interface Module {
  readonly id: string;
  /** Module code, e.g. "CSC2601". */
  readonly code: string;
  readonly title: string;
  /**
   * Semester mark required to qualify for the exam. `null` means "inherit the
   * student's default DP bar" rather than "no bar".
   */
  readonly threshold: number | null;
  readonly assessments: readonly Assessment[];
  /** Sort position within the dashboard. */
  readonly order: number;
}

/** Editable identity details shown on the dashboard header card. */
export interface Profile {
  readonly name: string;
  readonly course: string;
  readonly year: string;
}

/** Per-student settings that are not tied to a single module. */
export interface Preferences {
  readonly profile: Profile;
  /** DP bar applied to modules that do not override it. */
  readonly defaultThreshold: number;
}

/** Where a module stands relative to its DP bar. */
export type DpStatus = 'secured' | 'in-progress' | 'missed';

export const DEFAULT_THRESHOLD = 50;
export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 100;

export const EMPTY_PROFILE: Profile = { name: '', course: '', year: '' };

export const DEFAULT_PREFERENCES: Preferences = {
  profile: EMPTY_PROFILE,
  defaultThreshold: DEFAULT_THRESHOLD,
};
