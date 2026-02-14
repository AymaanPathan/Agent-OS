import express from "express";
import { dockerConnectionService } from "../service/docker.connection.service";

const router = express.Router();

/**
 * GET /api/docker/status
 * Get current Docker connection status
 */
router.get("/status", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const status =
      await dockerConnectionService.getConnectionStatus(forceRefresh);

    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error("❌ Error getting Docker status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/docker/connect
 * Test or update Docker connection
 */
router.post("/connect", async (req, res) => {
  try {
    const { mode, host } = req.body;

    // Validate input
    if (mode && !["local", "remote"].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid mode. Must be 'local' or 'remote'",
      });
    }

    if (mode === "remote" && !host) {
      return res.status(400).json({
        success: false,
        error: "Host is required for remote connections",
      });
    }

    // Update configuration if provided
    let status;
    if (mode) {
      status = await dockerConnectionService.updateConfiguration({
        mode,
        host: mode === "remote" ? host : undefined,
      });
    } else {
      // Just test current connection
      status = await dockerConnectionService.testConnection();
    }

    res.json({
      success: status.connected,
      status,
      message: status.connected
        ? "Docker connected successfully"
        : "Failed to connect to Docker",
    });
  } catch (error: any) {
    console.error("❌ Error connecting to Docker:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/docker/info
 * Get detailed Docker information
 */
router.get("/info", async (req, res) => {
  try {
    const info = await dockerConnectionService.getDockerInfo();

    res.json({
      success: true,
      info,
    });
  } catch (error: any) {
    console.error("❌ Error getting Docker info:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/docker/config
 * Get current Docker connection configuration
 */
router.get("/config", async (req, res) => {
  try {
    const config = dockerConnectionService.getConfiguration();

    res.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("❌ Error getting Docker config:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
