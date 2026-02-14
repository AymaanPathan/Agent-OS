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
import dockerConnectionRoutes from "./routes/docker.connection.routes";

// Import socket handlers
import { setupSocketHandlers } from "./lib/socket";
import { setupMonitorSocketHandlers } from "./lib/monitor-socket-handler";
import { handleMcp } from "./mcp/health-mcp/mcp.route";

// Import Docker connection service
import { dockerConnectionService } from "./service/docker.connection.service";

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
].filter((url): url is string => url !== undefined);

// Initialize Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Middleware - CORS first
app.use(
  cors({
    origin: allowedOrigins || "*",
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

// Docker connection routes (no auth required)
app.use("/api/docker", dockerConnectionRoutes);

// API Routes (Docker connection will be checked via middleware in sensitive routes)
app.use("/api/workflows", workflowRoutes);
app.use("/api/runs", runRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/monitor", monitorApiRouter);
app.use("/api/history", historyRoutes);

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

// Socket.IO connection handler for Docker status
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Send initial Docker status
  dockerConnectionService.getConnectionStatus().then((status:any) => {
    socket.emit("docker-status", status);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

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

// Check Docker connection on startup
async function initializeDockerConnection() {
  console.log("\n🐳 Checking Docker connection...");
  try {
    const status = await dockerConnectionService.testConnection();

    if (status.connected) {
      console.log("✅ Docker connected successfully");
      console.log(`   Mode: ${status.mode}`);
      console.log(`   Version: ${status.version}`);
      console.log(`   Containers: ${status.containers}`);
      if (status.host) {
        console.log(`   Host: ${status.host}`);
      }
    } else {
      console.warn("⚠️  Docker connection failed");
      console.warn(`   Error: ${status.error}`);
      console.warn(
        "   Note: Docker-dependent features will not work until connection is established",
      );
    }
  } catch (error: any) {
    console.error("❌ Failed to check Docker connection:", error.message);
    console.warn(
      "   Note: Docker-dependent features will not work until connection is established",
    );
  }
}

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
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

  // Initialize Docker connection
  await initializeDockerConnection();

  // Periodically check Docker connection and broadcast status
  setInterval(async () => {
    const status = await dockerConnectionService.getConnectionStatus(true);
    io.emit("docker-status", status);
  }, 30000); // Every 30 seconds
});

export { app };
