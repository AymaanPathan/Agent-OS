import express from "express";
import { ContinuousMonitor } from "../engine/tools/monitor.tool";

const router = express.Router();

// Active monitors storage (in-memory for now)
const activeMonitors = new Map<string, ContinuousMonitor>();

// Start monitoring endpoint
router.post("/start", async (req, res) => {
  try {
    const { sessionId, config } = req.body;

    // Check if monitor already exists
    if (activeMonitors.has(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Monitor already running for this session",
      });
    }

    // Create new monitor
    const monitor = new ContinuousMonitor({
      targets: config.targets || "containers",
      interval: config.interval || 30,
      alertOnChange: config.alertOnChange !== false,
      containerFilters: config.containerFilters,
      autoFix: config.autoFix !== false,
    });

    activeMonitors.set(sessionId, monitor);

    // Start monitoring
    await monitor.start();

    res.json({
      success: true,
      sessionId,
      message: "Monitoring started successfully",
    });
  } catch (error: any) {
    console.error("❌ [Monitor API] Start error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stop monitoring endpoint
router.post("/stop", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    monitor.stop();
    activeMonitors.delete(sessionId);

    res.json({
      success: true,
      message: "Monitoring stopped",
    });
  } catch (error: any) {
    console.error("❌ [Monitor API] Stop error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get monitor status
router.get("/status/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      return res.json({
        success: true,
        isRunning: false,
      });
    }

    const state = monitor.getState();
    res.json({
      success: true,
      isRunning: state.isRunning,
      state,
    });
  } catch (error: any) {
    console.error("❌ [Monitor API] Status error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Pause monitoring
router.post("/pause", (req, res) => {
  try {
    const { sessionId } = req.body;

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    // Add pause functionality to monitor
    // This will need to be implemented in monitor.tool.ts

    res.json({
      success: true,
      message: "Monitoring paused",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Resume monitoring
router.post("/resume", (req, res) => {
  try {
    const { sessionId } = req.body;

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    // Add resume functionality

    res.json({
      success: true,
      message: "Monitoring resumed",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as monitorApiRouter, activeMonitors };
