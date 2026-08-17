import express from "express";
import { syncUserHandler } from "./sync-user.handler.js";

import { Router } from 'express';
const router = Router();
router.post("/sync-user", syncUserHandler);

export default router;