import express from "express";
import { ContinuousMonitor } from "../engine/tools/monitor.tool";
import { setupMonitorSocketBridge } from "../lib/monitorSocketBridge";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";
import { io } from "../index";

const router = express.Router();

// Active monitors storage (in-memory for now)
const activeMonitors = new Map<string, ContinuousMonitor>();

// ====================================
// START MONITORING
// ====================================
router.post("/start", async (req, res) => {
  try {
    const { sessionId, config } = req.body;

    console.log("🟢 [Monitor API] Start request received");
    console.log("📋 [Monitor API] Session ID:", sessionId);
    console.log("⚙️ [Monitor API] Config:", config);

    // Check if monitor already exists
    if (activeMonitors.has(sessionId)) {
      console.log("⚠️ [Monitor API] Monitor already running");
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
    console.log("✅ [Monitor API] Monitor created");

    // Setup socket bridge BEFORE starting
    setupMonitorSocketBridge(monitor, sessionId, io);
    console.log("✅ [Monitor API] Socket bridge setup complete");

    // Start monitoring
    await monitor.start();
    console.log("✅ [Monitor API] Monitor started successfully");

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

// ====================================
// STOP MONITORING
// ====================================
router.post("/stop", async (req, res) => {
  try {
    const { sessionId } = req.body;

    console.log("🔴 [Monitor API] Stop request for session:", sessionId);

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      console.log("⚠️ [Monitor API] Monitor not found");
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    monitor.stop();
    activeMonitors.delete(sessionId);
    console.log("✅ [Monitor API] Monitor stopped");

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

// ====================================
// GET MONITOR STATUS
// ====================================
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

// ====================================
// SLACK NOTIFICATION ENDPOINT
// ====================================
router.post("/slack-notify", async (req, res) => {
  try {
    const {
      webhookUrl,
      message,
      severity,
      metadata,
      includeLogSnippet,
      logSnippet,
    } = req.body;

    console.log("📢 [Monitor API] Slack notify request");

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: "Webhook URL is required",
      });
    }

    // Use MCP tool to send Slack notification
    const result = await executeMCPTool("tool.slackNotify", {
      webhookUrl,
      message,
      severity: severity || "info",
      metadata: metadata || {},
      includeLogSnippet: includeLogSnippet || false,
      logSnippet: logSnippet || "",
    });

    console.log("✅ [Monitor API] Slack notification result:", result);

    res.json({
      success: result.success,
      message: result.success
        ? "Notification sent successfully"
        : "Failed to send notification",
      details: result,
    });
  } catch (error: any) {
    console.error("❌ [Monitor API] Slack notify error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ====================================
// PAUSE MONITORING
// ====================================
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

    monitor.stop();

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

// ====================================
// RESUME MONITORING
// ====================================
router.post("/resume", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const monitor = activeMonitors.get(sessionId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    await monitor.start();

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
