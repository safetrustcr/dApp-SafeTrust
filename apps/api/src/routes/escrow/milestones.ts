import { ApiError } from '../../http/api-error.js';

/**
 * Milestone ids stored in escrow_milestones, by on-chain index.
 * The MVP rental escrow has a single milestone: the check-in / stay.
 */
export const MILESTONE_IDS: readonly string[] = ['check_in'];

export function parseMilestoneIndex(value: unknown): number {
  const index = value === undefined ? 0 : Number(value);
  if (!Number.isInteger(index) || index < 0 || index >= MILESTONE_IDS.length) {
    throw new ApiError(400, 'INVALID_MILESTONE_INDEX', `milestoneIndex must be between 0 and ${MILESTONE_IDS.length - 1}.`);
  }
  return index;
}

export function milestoneIdFor(index: number): string {
  return MILESTONE_IDS[index];
}
