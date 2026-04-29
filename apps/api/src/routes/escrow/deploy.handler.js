const { trustlessWork } = require('../../lib/trustlesswork');

/**
 * Scaffold escrow deploy handler
 * Receives escrow creation request, calls TrustlessWork, and returns unsigned XDR.
 */
async function deployEscrowHandler(req, res) {
  const { apartmentId, tenantAddress, ownerAddress, amount, engagementId } = req.body;

  try {
    const response = await trustlessWork.post('/deployer/single-release', {
      signer: tenantAddress,
      engagementId,
      title: `SafeTrust Rental Deposit - ${apartmentId}`,
      description: 'Security deposit for rental agreement via SafeTrust',
      roles: {
        approver: tenantAddress,
        serviceProvider: ownerAddress,
        platformAddress: process.env.PLATFORM_STELLAR_ADDRESS,
        releaseSigner: tenantAddress,
        disputeResolver: process.env.PLATFORM_STELLAR_ADDRESS,
        receiver: ownerAddress,
      },
      amount,
      platformFee: Number(process.env.PLATFORM_FEE_PERCENT ?? 1),
      milestones: [
        { description: 'Security deposit — rental period' }
      ],
    });

    const { unsignedTransaction } = response.data;

    // Log status 200 confirmation
    console.log(`[escrow/deploy] TrustlessWork 201 received — engagementId: ${engagementId}`);

    return res.status(200).json({
      unsignedXDR: unsignedTransaction,
      engagementId,
    });

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;

    // TrustlessWork specific error mapping to 400
    const knownErrors = {
      'amount cannot be zero': 'Amount cannot be zero',
      'already initialized': 'Escrow already initialized (duplicate engagementId)',
      'fee cannot exceed 99%': 'Platform fee cannot exceed 99%',
      'without milestone': 'Escrow initialized without milestone',
      'more than 50 milestones': 'Cannot define more than 50 milestones',
      'flags must be false': 'All flags (approved, disputed, released) must be false'
    };

    for (const [key, descriptive] of Object.entries(knownErrors)) {
      if (errorMessage.toLowerCase().includes(key)) {
        return res.status(400).json({
          error: descriptive,
          details: errorMessage,
        });
      }
    }

    console.error('[escrow/deploy] TrustlessWork error:', errorData ?? error.message);
    return res.status(500).json({
      error: 'Failed to deploy escrow',
      details: errorData ?? error.message,
    });
  }
}

module.exports = { deployEscrowHandler };
