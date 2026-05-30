import express from "express";
import { syncUserHandler } from "./sync-user.handler.js";

const router = express.Router();
router.post("/sync-user", syncUserHandler);

export default router;