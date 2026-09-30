const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./auth");
const walletAuthRoutes = require("./wallet-auth");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Existing auth routes
app.use("/api/auth", authRoutes);

// New wallet authentication routes
app.use("/api/auth", walletAuthRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
