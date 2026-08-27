import { Module } from './models';

/**
 * Demo data offered from the empty state so a new student can see what a
 * filled-in semester looks like before entering their own.
 */
export function sampleSemester(): Module[] {
  return [
    {
      id: 'sample-csc2601',
      code: 'CSC2601',
      title: 'Database Systems',
      threshold: null,
      order: 0,
      assessments: [
        { id: 'sample-csc2601-1', name: 'Assignment 1', weight: 15, mark: 78 },
        { id: 'sample-csc2601-2', name: 'Test 1', weight: 25, mark: 64 },
        { id: 'sample-csc2601-3', name: 'Project', weight: 30, mark: null },
        { id: 'sample-csc2601-4', name: 'Test 2', weight: 30, mark: null },
      ],
    },
    {
      id: 'sample-mat1512',
      code: 'MAT1512',
      title: 'Calculus A',
      threshold: 40,
      order: 1,
      assessments: [
        { id: 'sample-mat1512-1', name: 'Test 1', weight: 30, mark: 41 },
        { id: 'sample-mat1512-2', name: 'Test 2', weight: 30, mark: 38 },
        { id: 'sample-mat1512-3', name: 'Assignment 2', weight: 40, mark: null },
      ],
    },
    {
      id: 'sample-eco1101',
      code: 'ECO1101',
      title: 'Microeconomics',
      threshold: null,
      order: 2,
      assessments: [
        { id: 'sample-eco1101-1', name: 'Essay', weight: 20, mark: 72 },
        { id: 'sample-eco1101-2', name: 'Test 1', weight: 40, mark: 81 },
        { id: 'sample-eco1101-3', name: 'Test 2', weight: 40, mark: null },
      ],
    },
    {
      id: 'sample-phy1503',
      code: 'PHY1503',
      title: 'Mechanics',
      threshold: null,
      order: 3,
      assessments: [
        { id: 'sample-phy1503-1', name: 'Practicals', weight: 20, mark: 30 },
        { id: 'sample-phy1503-2', name: 'Test 1', weight: 40, mark: 22 },
        { id: 'sample-phy1503-3', name: 'Test 2', weight: 20, mark: 18 },
        { id: 'sample-phy1503-4', name: 'Assignment', weight: 20, mark: 12 },
      ],
    },
  ];
}
