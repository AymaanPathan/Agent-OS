const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "v2.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.json({ service: "agentos-backend", version: "v2.1.0" });
});

const PORT = process.env.PORT || 5000;

// ─── SIMULATED STARTUP SEQUENCE ─────────────────
// Mirrors the order in your real server.ts so logs look authentic

console.log("🔄 [v2] Initializing AgentOS Backend...");
console.log("🔄 [v2] Loading environment variables...");
console.log("🔄 [v2] Registering middleware...");
console.log("🔄 [v2] Setting up Socket.IO...");
console.log("🔄 [v2] Loading route modules...");
console.log("🔄 [v2] Connecting to database...");

// ─── 💀 FATAL CRASH POINT ───────────────────────
// Bug: v2 requires an env var that was never set in the deployment.
// Crash happens AFTER partial init (realistic — container starts,
// prints logs, then dies). Docker reports exit, not a build failure.

const REQUIRED_DB_SECRET = process.env.AGENTOS_DB_SECRET;

if (!REQUIRED_DB_SECRET) {
  console.error(
    "❌ [v2] FATAL: Environment variable AGENTOS_DB_SECRET is not set",
  );
  console.error(
    "❌ [v2] This variable is required for database encryption in v2.1.0",
  );
  console.error(
    "❌ [v2] Added in commit a3f9c2e — see CHANGELOG for migration steps",
  );
  console.error(
    "❌ [v2] Shutting down — cannot start without required configuration",
  );
  process.exit(1);
}

// ─── Never reached ──────────────────────────────
console.log("✅ [v2] All modules loaded successfully");

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║         🚀 AgentOS Backend Server  (v2)      ║
║   Port: ${PORT}  |  Version: v2.1.0 (latest)   ║
╚═══════════════════════════════════════════════╝
  `);
});
