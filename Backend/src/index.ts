import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import workflowRoutes from "./routes/workflow.routes";
import runRoutes from "./routes/run.routes";
import toolRoutes from "./routes/tool.route";
import { monitorApiRouter } from "./routes/MonitorApi.routes";
import historyRoutes from "./routes/History.routes";

// Import socket handlers
import { setupSocketHandlers } from "./lib/socket";
import { setupMonitorSocketHandlers } from "./lib/monitor-socket-handler";
import { handleMcp } from "./mcp/health-mcp/mcp.route";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Middleware - CORS first
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// ⚠️ CRITICAL: MCP endpoint MUST come before express.json() middleware
app.post("/mcp", handleMcp);

// JSON parsing middleware for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/workflows", workflowRoutes);
app.use("/api/runs", runRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/monitor", monitorApiRouter);
app.use("/api/history", historyRoutes); // ✅ Add history routes

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  },
);

// Setup Socket.IO handlers
setupSocketHandlers(io);
setupMonitorSocketHandlers(io);

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/agentos";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║         🚀 AgentOS Backend Server            ║
║                                               ║
║   Port: ${PORT}                                  ║
║   Environment: ${process.env.NODE_ENV || "development"}                  ║
║   MongoDB: ${MONGODB_URI.includes("localhost") ? "Local" : "Remote"}                             ║
║   Monitor: Enabled                            ║
║   History: Enabled                            ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export { app };
