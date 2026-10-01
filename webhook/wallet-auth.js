const express = require("express");
const rateLimit = require("express-rate-limit");
const { Keypair, Networks, StrKey, TransactionBuilder, BASE_FEE, Operation, Asset, Account } = require("@stellar/stellar-sdk");
const admin = require("firebase-admin");
const { consumeChallenge, rememberChallenge } = require("./wallet-auth-store");

const router = express.Router();

const SERVER_KP = Keypair.fromSecret(process.env.SEP10_SIGNING_SECRET);
const NETWORK = process.env.STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
const HOME_DOMAIN = process.env.SEP10_HOME_DOMAIN;
const WEB_AUTH_DOMAIN = process.env.SEP10_WEB_AUTH_DOMAIN || HOME_DOMAIN;
const TIMEOUT_S = 300;

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/wallet/challenge", limiter, async (req, res) => {
  const { account } = req.body ?? {};
  
  if (!StrKey.isValidEd25519PublicKey(account)) {
    return res.status(400).json({ error: "Invalid account public key" });
  }

  try {
    const accountObj = new Account(SERVER_KP.publicKey(), String(NETWORK === Networks.PUBLIC ? -1 : -2));
    
    const transaction = new TransactionBuilder(accountObj, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK
    })
      .addOperation(
        Operation.manageData({
          name: `auth-${account}`,
          value: `challenge for ${account}`,
          source: SERVER_KP.publicKey()
        })
      )
      .setTimeout(TIMEOUT_S)
      .build();

    transaction.sign(SERVER_KP);
    const transactionXdr = transaction.toXDR();
    const challengeId = rememberChallenge(account, transactionXdr);

    return res.json({
      transaction: transactionXdr,
      network_passphrase: NETWORK,
      challenge_id: challengeId
    });
  } catch (error) {
    console.error("Challenge generation error:", error);
    return res.status(500).json({ error: "Failed to generate challenge" });
  }
});

router.post("/wallet/verify", limiter, async (req, res) => {
  const { transaction, challenge_id } = req.body ?? {};
  
  if (!transaction || !challenge_id) {
    return res.status(400).json({ error: "Missing transaction or challenge_id" });
  }

  try {
    const challengeEntry = consumeChallenge(challenge_id, transaction);
    
    if (!challengeEntry) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    const tx = TransactionBuilder.fromXDR(transaction, NETWORK);
    const signers = tx.signatures.map(sig => sig.hint().toString());
    
    if (!signers.includes(StrKey.encodeEd25519PublicKey(challengeEntry.account))) {
      return res.status(400).json({ error: "Transaction not signed by wallet" });
    }

    const uid = `stellar:${challengeEntry.account}`;
    const customToken = await admin.auth().createCustomToken(uid);

    return res.json({ customToken });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ error: "Failed to verify transaction" });
  }
});

module.exports = router;
