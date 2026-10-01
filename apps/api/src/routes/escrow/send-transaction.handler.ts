import { Request, Response } from 'express';
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { getPendingActionByHash, markPendingActionSubmitted } from '../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';

export const sendTransactionHandler = async (req: Request, res: Response) => {
  try {
    const { signedXdr } = req.body;
    if (!signedXdr || typeof signedXdr !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid signedXdr' });
    }

    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
    const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const txHash = tx.hash().toString("hex");

    const pending = await getPendingActionByHash(txHash);
    
    if (!pending) {
      return res.status(404).json({ error: "Unknown transaction. Build it through SafeTrust first." });
    }
    
    // @ts-ignore
    if (pending.built_for_uid !== req.user?.uid) {
      return res.status(403).json({ error: "This transaction was built for another user." });
    }
    
    if (pending.status === "submitted" || pending.status === "confirmed") {
      return res.status(200).json({ txHash, status: pending.status }); // idempotent replay
    }
    
    if (new Date(pending.expires_at) < new Date()) {
      return res.status(410).json({ error: "Transaction expired. Build it again." });
    }

    // Forward to Trustless Work
    const twResult = await trustlessWorkRequest('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr },
    });

    await markPendingActionSubmitted(pending.id);

    return res.status(200).json({ txHash, status: "submitted", twResult });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error submitting transaction." });
  }
};
