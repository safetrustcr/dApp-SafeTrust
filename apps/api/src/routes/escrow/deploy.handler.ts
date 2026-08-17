import { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';
import crypto from 'node:crypto';

type DeployRequestBody = {
  apartmentId?: string;
  senderAddress?: string;
  receiverAddress?: string;
  amount?: number;
};

type InitializeSingleReleaseEscrowResponse = {
  status: 'SUCCESS' | 'FAILED';
  contractId: string;
  unsignedTransaction?: string;
  message: string;
};

type DeployResponse = {
  status: string;
  contractId: string;
  unsignedXDR: string;
  message: string;
  engagementId: string;
};

export const deployEscrowHandler = async (
  req: Request<{}, DeployResponse | { error: string; payload?: unknown; messages?: string[] }, DeployRequestBody>,
  res: Response<DeployResponse | { error: string; payload?: unknown; messages?: string[] }>
): Promise<Response> => {
  try {
    const { apartmentId, senderAddress, receiverAddress, amount } = req.body || {};

    if (!apartmentId || !senderAddress || !receiverAddress) {
      return res.status(400).json({
        error: 'Missing required escrow deployment fields.',
      });
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount: must be a positive number.',
      });
    }

    const engagementId = crypto.randomUUID();

    const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || process.env.PLATFORM_STELLAR_ADDRESS;
    const trustlineAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.USDC_TRUSTLINE_ADDRESS;

    if (!platformAddress) {
      return res.status(500).json({
        error: 'Missing platform address for escrow role configuration.',
      });
    }

    if (!trustlineAddress) {
      return res.status(500).json({
        error: 'Missing trustline address for escrow configuration.',
      });
    }

    const payload = {
      signer: senderAddress,
      engagementId,
      title: `Security deposit for apartment ${apartmentId}`,
      description: `Security deposit escrow for apartment ${apartmentId}`,
      amount,
      platformFee: 0,
      roles: {
        approver: senderAddress,
        serviceProvider: receiverAddress,
        platformAddress,
        releaseSigner: platformAddress,
        disputeResolver: platformAddress,
        receiver: receiverAddress,
      },
      trustline: {
        symbol: 'USDC',
        address: trustlineAddress,
      },
      milestones: [{ description: `Release security deposit for apartment ${apartmentId}` }],
    };

    const result = await trustlessWorkRequest<InitializeSingleReleaseEscrowResponse>(
      '/deployer/single-release',
      {
        method: 'POST',
        body: payload,
      },
    );

    if (result.status !== 'SUCCESS' || !result.unsignedTransaction) {
      return res.status(502).json({
        error: result.message ?? 'TrustlessWork escrow deploy failed.',
        payload: result,
      });
    }

    return res.status(200).json({
      status: result.status,
      contractId: result.contractId,
      unsignedXDR: result.unsignedTransaction,
      message: result.message,
      engagementId,
    });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    const messages = getErrorMessages(error, 'Failed to deploy escrow.');
    return res.status(500).json({
      error: messages[0],
    });
  }
};
