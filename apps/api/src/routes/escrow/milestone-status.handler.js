import { trustlessWork } from '../../lib/trustlesswork.js';

/**
 * Change milestone status handler
 * Validates the milestone-status change request, calls TrustlessWork, and returns
 * unsigned XDR for the browser to sign with Freighter. The API key stays server-side.
 */
export async function changeMilestoneStatusHandler(req, res) {
  const { contractId, milestoneIndex, newEvidence, newStatus, serviceProvider } = req.body || {};

  const missing = [];
  if (!contractId) missing.push('contractId');
  if (milestoneIndex === undefined || milestoneIndex === null || milestoneIndex === '') {
    missing.push('milestoneIndex');
  }
  if (!newEvidence) missing.push('newEvidence');
  if (!newStatus) missing.push('newStatus');
  if (!serviceProvider) missing.push('serviceProvider');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  try {
    const response = await trustlessWork.post('/escrow/single-release/change-milestone-status', {
      contractId,
      milestoneIndex,
      newEvidence,
      newStatus,
      serviceProvider,
    });

    const { unsignedTransaction } = response.data;

    console.log(`[escrow/milestone-status] TrustlessWork 201 received — contractId: ${contractId}, milestoneIndex: ${milestoneIndex}`);

    return res.status(201).json({ unsignedTransaction });

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;

    console.error('[escrow/milestone-status] TrustlessWork error:', errorData ?? error.message);
    return res.status(500).json({
      error: 'Failed to change milestone status',
      details: errorMessage,
    });
  }
}
