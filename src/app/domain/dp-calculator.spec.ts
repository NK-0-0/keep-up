import { describe, expect, it } from 'vitest';
import { computeTotals, evaluateModule, formatPercent, summariseSemester } from './dp-calculator';
import { Assessment, Module } from './models';

function moduleWith(assessments: Assessment[], threshold: number | null = null): Module {
  return { id: 'm1', code: 'CSC2601', title: 'Database Systems', threshold, assessments, order: 0 };
}

function assessment(weight: number, mark: number | null, name = 'Test'): Assessment {
  return { id: `${name}-${weight}-${mark}`, name, weight, mark };
}

describe('formatPercent', () => {
  it('drops a trailing zero decimal', () => {
    expect(formatPercent(64)).toBe('64%');
    expect(formatPercent(64.04)).toBe('64%');
  });

  it('keeps one decimal when it is significant', () => {
    expect(formatPercent(64.25)).toBe('64.3%');
  });
});

describe('computeTotals', () => {
  it('banks only the weight of assessments that have marks', () => {
    const totals = computeTotals(
      moduleWith([assessment(15, 78), assessment(25, 64), assessment(60, null)]),
    );

    expect(totals.totalWeight).toBe(100);
    expect(totals.gradedWeight).toBe(40);
    expect(totals.gradedCount).toBe(2);
    expect(totals.earned).toBeCloseTo(27.7);
    expect(totals.remainingWeight).toBe(60);
    expect(totals.best).toBeCloseTo(87.7);
  });

  it('treats a mark of zero as written, unlike a null mark', () => {
    const zero = computeTotals(moduleWith([assessment(50, 0), assessment(50, null)]));

    expect(zero.gradedCount).toBe(1);
    expect(zero.gradedWeight).toBe(50);
    expect(zero.best).toBe(50);
  });

  it('does not report negative remaining weight when weights exceed 100', () => {
    const totals = computeTotals(moduleWith([assessment(80, 50), assessment(40, 50)]));

    expect(totals.totalWeight).toBe(120);
    expect(totals.remainingWeight).toBe(0);
  });
});

describe('evaluateModule', () => {
  it('secures DP once the banked mark reaches the bar', () => {
    const result = evaluateModule(moduleWith([assessment(60, 90), assessment(40, null)]), 50);

    expect(result.status).toBe('secured');
    expect(result.verdict).toContain('DP secured');
    expect(result.shortNote).toBe('Past the 50% DP bar');
  });

  it('reports the average still needed while DP is reachable', () => {
    const result = evaluateModule(moduleWith([assessment(50, 40), assessment(50, null)]), 50);

    expect(result.status).toBe('in-progress');
    expect(result.requiredAverage).toBeCloseTo(60);
    expect(result.verdict).toBe('Average 60% on the remaining 50% and you are in.');
  });

  it('marks DP as missed when full marks on the rest still fall short', () => {
    const result = evaluateModule(moduleWith([assessment(80, 20), assessment(20, null)]), 50);

    expect(result.status).toBe('missed');
    expect(result.verdict).toContain('short of 50%');
  });

  it('uses the module override in place of the default bar', () => {
    const assessments = [assessment(100, 41)];

    expect(evaluateModule(moduleWith(assessments, 40), 50).status).toBe('secured');
    expect(evaluateModule(moduleWith(assessments, null), 50).status).toBe('missed');
  });

  it('has no required average once everything has been written', () => {
    const result = evaluateModule(moduleWith([assessment(100, 45)]), 50);

    expect(result.requiredAverage).toBeNull();
    // Nothing left to write and short of the bar means DP is gone, not pending.
    expect(result.status).toBe('missed');
  });

  it('does not declare DP lost over a rounding-width shortfall', () => {
    const result = evaluateModule(moduleWith([assessment(100, 49.99999)]), 50);

    expect(result.status).toBe('in-progress');
    expect(result.verdict).toBe('Nothing left to write and you are 0% short.');
  });

  it('warns when weights do not add up to 100', () => {
    expect(evaluateModule(moduleWith([assessment(80, 50)]), 50).weightWarning).toBe(
      'Weights add to 80% — 20% unaccounted for.',
    );
    expect(evaluateModule(moduleWith([assessment(120, 50)]), 50).weightWarning).toBe(
      'Weights add to 120% — that is over 100.',
    );
  });

  it('does not warn about an empty module', () => {
    expect(evaluateModule(moduleWith([]), 50).weightWarning).toBeNull();
  });

  it('treats an exactly-on-the-bar mark as secured', () => {
    expect(evaluateModule(moduleWith([assessment(50, 100)]), 50).status).toBe('secured');
  });
});

describe('summariseSemester', () => {
  it('invites setup when there are no modules', () => {
    const summary = summariseSemester([]);

    expect(summary.total).toBe(0);
    expect(summary.title).toBe('Let us set up your semester');
  });

  it('counts each status and leads with the lost modules when there are any', () => {
    const summary = summariseSemester([
      evaluateModule(moduleWith([assessment(100, 90)]), 50),
      evaluateModule(moduleWith([assessment(50, 40), assessment(50, null)]), 50),
      evaluateModule(moduleWith([assessment(100, 10)]), 50),
    ]);

    expect([summary.secured, summary.inProgress, summary.missed]).toEqual([1, 1, 1]);
    expect(summary.title).toBe('1 secured, 1 without DP');
  });

  it('celebrates a clean sweep', () => {
    const summary = summariseSemester([
      evaluateModule(moduleWith([assessment(100, 90)]), 50),
      evaluateModule(moduleWith([assessment(100, 80)]), 50),
    ]);

    expect(summary.title).toBe('DP secured in all 2 modules');
  });
});
