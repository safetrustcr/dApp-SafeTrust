import { trustlessWork } from '../../lib/trustlesswork.js';

/**
 * Fund escrow handler
 * Validates the funding request, calls TrustlessWork, and returns unsigned XDR
 * for the browser to sign with Freighter. The API key stays server-side.
 */
export async function fundEscrowHandler(req, res) {
  const { contractId, signer, amount } = req.body || {};

  const missing = [];
  if (!contractId) missing.push('contractId');
  if (!signer) missing.push('signer');
  if (amount === undefined || amount === null || amount === '') missing.push('amount');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  try {
    const response = await trustlessWork.post('/escrow/single-release/fund-escrow', {
      contractId,
      signer,
      amount,
    });

    const { unsignedTransaction } = response.data;

    console.log(`[escrow/fund] TrustlessWork 201 received — contractId: ${contractId}`);

    return res.status(201).json({ unsignedTransaction });

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;

    console.error('[escrow/fund] TrustlessWork error:', errorData ?? error.message);
    return res.status(500).json({
      error: 'Failed to fund escrow',
      details: errorMessage,
    });
  }
}
