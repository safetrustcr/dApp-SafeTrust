import { trustlessWork } from '../../lib/trustlesswork.js';

/**
 * Release funds handler
 * Validates the release request, calls TrustlessWork, and returns unsigned XDR
 * for the browser to sign with Freighter. The API key stays server-side.
 */
export async function releaseFundsHandler(req, res) {
  const { contractId, releaseSigner } = req.body || {};

  const missing = [];
  if (!contractId) missing.push('contractId');
  if (!releaseSigner) missing.push('releaseSigner');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  try {
    const response = await trustlessWork.post('/escrow/single-release/release-funds', {
      contractId,
      releaseSigner,
    });

    const { unsignedTransaction } = response.data;

    console.log(`[escrow/release-funds] TrustlessWork 201 received — contractId: ${contractId}`);

    return res.status(201).json({ unsignedTransaction });

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;

    console.error('[escrow/release-funds] TrustlessWork error:', errorData ?? error.message);
    return res.status(500).json({
      error: 'Failed to release funds',
      details: errorMessage,
    });
  }
}
