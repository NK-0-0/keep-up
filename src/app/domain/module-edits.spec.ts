import { describe, expect, it } from 'vitest';
import {
  clampThreshold,
  createAssessment,
  createModule,
  normaliseMark,
  parseNumber,
} from './module-edits';

describe('parseNumber', () => {
  it('returns null for anything that is not a finite number', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(parseNumber('64.5')).toBe(64.5);
    expect(parseNumber(0)).toBe(0);
  });
});

describe('clampThreshold', () => {
  it('falls back when the input is unusable', () => {
    expect(clampThreshold('', 50)).toBe(50);
    expect(clampThreshold('nope', 40)).toBe(40);
  });

  it('rounds and clamps into the allowed range', () => {
    expect(clampThreshold('47.6', 50)).toBe(48);
    expect(clampThreshold(-20, 50)).toBe(1);
    expect(clampThreshold(180, 50)).toBe(100);
  });
});

describe('normaliseMark', () => {
  it('distinguishes an unwritten assessment from a zero', () => {
    expect(normaliseMark('')).toBeNull();
    expect(normaliseMark('   ')).toBeNull();
    expect(normaliseMark('0')).toBe(0);
  });

  it('clamps marks to 0–100', () => {
    expect(normaliseMark('130')).toBe(100);
    expect(normaliseMark('-5')).toBe(0);
  });
});

describe('createModule', () => {
  it('upper-cases the code and defaults blank fields', () => {
    const module = createModule('  csc2601 ', '  ', 3);

    expect(module.code).toBe('CSC2601');
    expect(module.title).toBe('Untitled module');
    expect(module.threshold).toBeNull();
    expect(module.order).toBe(3);
    expect(module.assessments).toEqual([]);
  });
});

describe('createAssessment', () => {
  it('defaults a blank weight to zero and a blank mark to unwritten', () => {
    const assessment = createAssessment('  ', '', '');

    expect(assessment.name).toBe('Assessment');
    expect(assessment.weight).toBe(0);
    expect(assessment.mark).toBeNull();
  });
});
