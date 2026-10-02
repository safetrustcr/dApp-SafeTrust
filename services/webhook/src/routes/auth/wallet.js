const express = require('express');
const {
  createWalletChallengeHandler,
  verifyWalletChallengeHandler,
} = require('../../controllers/wallet-auth.controller');

const router = express.Router();

router.post('/challenge', createWalletChallengeHandler);
router.post('/verify', verifyWalletChallengeHandler);

module.exports = router;
