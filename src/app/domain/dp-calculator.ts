import { DpStatus, Module, DEFAULT_THRESHOLD } from './models';

/** Guards against float noise when comparing a best-case mark to the DP bar. */
const EPSILON = 0.0001;

/** Raw weight/mark arithmetic for one module. */
export interface ModuleTotals {
  /** Sum of every assessment weight — should be 100 for a well-formed module. */
  readonly totalWeight: number;
  /** Semester mark banked so far, out of 100. */
  readonly earned: number;
  /** Weight of the assessments that already have a mark. */
  readonly gradedWeight: number;
  /** Weight still up for grabs. */
  readonly remainingWeight: number;
  /** Semester mark if every remaining assessment scored 100%. */
  readonly best: number;
  readonly gradedCount: number;
}

/** Everything the UI needs to render one module, derived from its raw data. */
export interface ModuleEvaluation {
  readonly module: Module;
  readonly totals: ModuleTotals;
  /** The DP bar actually in force, after applying the default. */
  readonly threshold: number;
  readonly status: DpStatus;
  /**
   * Average percentage needed across the remaining weight to reach the bar.
   * `null` when nothing is left to write. May exceed 100 when unreachable.
   */
  readonly requiredAverage: number | null;
  /** Full sentence shown on the detail card. */
  readonly verdict: string;
  /** Condensed phrasing shown on the glance card. */
  readonly shortNote: string;
  /** Set when the weights do not add up to 100, otherwise `null`. */
  readonly weightWarning: string | null;
}

/** Counts and headline copy for the whole semester. */
export interface SemesterSummary {
  readonly total: number;
  readonly secured: number;
  readonly inProgress: number;
  readonly missed: number;
  readonly title: string;
  readonly subtitle: string;
}

/** Formats a mark the way the design does: one decimal, trimmed, percent-suffixed. */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Math.abs(rounded % 1) < 0.05 ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${text}%`;
}

export function computeTotals(module: Module): ModuleTotals {
  let totalWeight = 0;
  let earned = 0;
  let gradedWeight = 0;
  let gradedCount = 0;

  for (const assessment of module.assessments) {
    const weight = assessment.weight || 0;
    totalWeight += weight;
    if (assessment.mark !== null && assessment.mark !== undefined) {
      earned += (assessment.mark / 100) * weight;
      gradedWeight += weight;
      gradedCount++;
    }
  }

  const remainingWeight = Math.max(0, totalWeight - gradedWeight);
  return {
    totalWeight,
    earned,
    gradedWeight,
    remainingWeight,
    best: earned + remainingWeight,
    gradedCount,
  };
}

export function resolveThreshold(module: Module, defaultThreshold: number): number {
  return module.threshold ?? defaultThreshold;
}

export function evaluateModule(
  module: Module,
  defaultThreshold: number = DEFAULT_THRESHOLD,
): ModuleEvaluation {
  const totals = computeTotals(module);
  const threshold = resolveThreshold(module, defaultThreshold);

  // A module with nothing recorded yet has no verdict to give. Without this
  // guard the arithmetic is technically right but the conclusion is absurd:
  // best = 0, so a module created seconds ago is declared unreachable and shown
  // as a failure before the student has entered anything.
  const assessed = totals.totalWeight > 0;

  const secured = assessed && totals.earned >= threshold;
  const missed = assessed && totals.best < threshold - EPSILON;
  const status: DpStatus = secured ? 'secured' : missed ? 'missed' : 'in-progress';

  const requiredAverage =
    totals.remainingWeight > 0
      ? ((threshold - totals.earned) / totals.remainingWeight) * 100
      : null;

  return {
    module,
    totals,
    threshold,
    status,
    requiredAverage,
    verdict: buildVerdict(totals, threshold, status, requiredAverage, assessed),
    shortNote: buildShortNote(totals, threshold, status, requiredAverage, assessed),
    weightWarning: buildWeightWarning(module, totals),
  };
}

export function summariseSemester(evaluations: readonly ModuleEvaluation[]): SemesterSummary {
  const total = evaluations.length;
  let secured = 0;
  let inProgress = 0;
  let missed = 0;

  for (const evaluation of evaluations) {
    if (evaluation.status === 'secured') secured++;
    else if (evaluation.status === 'missed') missed++;
    else inProgress++;
  }

  return {
    total,
    secured,
    inProgress,
    missed,
    ...buildHeadline(total, secured, inProgress, missed),
  };
}

function buildVerdict(
  totals: ModuleTotals,
  threshold: number,
  status: DpStatus,
  requiredAverage: number | null,
  assessed: boolean,
): string {
  if (!assessed) {
    return 'Add the assessments that count towards this module to see where you stand.';
  }
  if (status === 'secured') {
    return 'DP secured — you have already banked enough to write.';
  }
  if (status === 'missed') {
    return (
      `Even full marks on what is left reaches ${formatPercent(totals.best)}, ` +
      `short of ${threshold}%. Talk to your lecturer about a concession.`
    );
  }
  if (requiredAverage === null) {
    return `Nothing left to write and you are ${formatPercent(threshold - totals.earned)} short.`;
  }
  return (
    `Average ${formatPercent(requiredAverage)} on the remaining ` +
    `${formatPercent(totals.remainingWeight)} and you are in.`
  );
}

function buildShortNote(
  totals: ModuleTotals,
  threshold: number,
  status: DpStatus,
  requiredAverage: number | null,
  assessed: boolean,
): string {
  if (!assessed) return 'No assessments yet';
  if (status === 'secured') return `Past the ${threshold}% DP bar`;
  if (status === 'missed') return `Cannot reach ${threshold}%`;
  if (requiredAverage === null) {
    return `${formatPercent(threshold - totals.earned)} short of ${threshold}%`;
  }
  return `Need ${formatPercent(requiredAverage)} on what is left`;
}

function buildWeightWarning(module: Module, totals: ModuleTotals): string | null {
  if (module.assessments.length === 0 || totals.totalWeight === 100) return null;
  if (totals.totalWeight > 100) {
    return `Weights add to ${formatPercent(totals.totalWeight)} — that is over 100.`;
  }
  return (
    `Weights add to ${formatPercent(totals.totalWeight)} — ` +
    `${formatPercent(100 - totals.totalWeight)} unaccounted for.`
  );
}

function buildHeadline(
  total: number,
  secured: number,
  inProgress: number,
  missed: number,
): { title: string; subtitle: string } {
  if (total === 0) {
    return {
      title: 'Let us set up your semester',
      subtitle:
        'Add a module and its assessments — KeepUp works out whether you qualify for the exam.',
    };
  }
  if (secured === total) {
    return {
      title: `DP secured in all ${total} modules`,
      subtitle: 'Every module is past its DP bar. Keep the marks coming and you stay there.',
    };
  }
  if (missed === 0) {
    return {
      title: `DP secured in ${secured} of ${total}`,
      subtitle:
        `${inProgress}${inProgress === 1 ? ' module still needs' : ' modules still need'} ` +
        'marks on the board — none of them are lost yet.',
    };
  }
  return {
    title: `${secured} secured, ${missed} without DP`,
    subtitle:
      `${missed}${missed === 1 ? ' module can' : ' modules can'} no longer reach the DP bar ` +
      'on assessment marks alone. Sort those out first.',
  };
}
