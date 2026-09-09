import express from "express";
import { activateWalletHandler } from "./activate-wallet.handler.js";

const router = express.Router();
router.post("/activate-wallet", activateWalletHandler as unknown as express.RequestHandler);

export default router;
