export function mapTrustlessWorkStatus(status: string | null | undefined): string {
  const normalized = (status ?? '').trim().toLowerCase();

  if (!normalized) {
    return 'created';
  }

  const createdStates = new Set([
    'created',
    'pending',
    'pending_signature',
    'initialized',
    'awaiting_funding',
    'incomplete',
    'open',
  ]);

  const fundedStates = new Set([
    'funded',
    'paid',
    'in_funds',
    'funding_complete',
  ]);

  const approvedStates = new Set([
    'milestone_approved',
    'approved',
    'approved_for_release',
  ]);

  const completedStates = new Set([
    'completed',
    'released',
    'release_complete',
  ]);

  const disputedStates = new Set(['disputed', 'in_dispute']);
  const resolvedStates = new Set(['resolved', 'completed_resolved', 'not_disputed']);
  const expiredStates = new Set(['expired', 'timed_out', 'expired_escrow']);

  if (createdStates.has(normalized)) return 'created';
  if (fundedStates.has(normalized)) return 'funded';
  if (approvedStates.has(normalized)) return 'milestone_approved';
  if (completedStates.has(normalized)) return 'completed';
  if (disputedStates.has(normalized)) return 'disputed';
  if (resolvedStates.has(normalized)) return 'resolved';
  if (expiredStates.has(normalized)) return 'expired';

  return normalized;
}
