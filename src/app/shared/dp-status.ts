import { DpStatus } from '../domain/models';

/** Badge copy for each DP status, matching the design. */
export const STATUS_LABEL: Record<DpStatus, string> = {
  secured: 'DP SECURED',
  'in-progress': 'IN PROGRESS',
  missed: "DIDN'T MAKE DP",
};

/**
 * Class that sets `--ku-status` / `--ku-status-bg` for a subtree, so status
 * colour lives in CSS rather than being computed in the component.
 */
export function statusClass(status: DpStatus): string {
  return `ku-status-${status}`;
}
