import express from "express";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";

const router = express.Router();

// Tool definitions
const TOOL_DEFINITIONS = {
  "tool.httpHealth": {
    toolName: "check_http_health",
    description: "Check HTTP endpoint health status",
  },
  "tool.dockerStatus": {
    toolName: "docker_status",
    description: "Get Docker container status",
  },
  "tool.dockerLogs": {
    toolName: "docker_logs",
    description: "Fetch Docker container logs",
  },
  "tool.dockerRestart": {
    toolName: "docker_restart",
    description: "Restart Docker container",
  },
  "tool.dockerRollback": {
    toolName: "docker_rollback",
    description: "Rollback Docker container to previous image",
  },
  "tool.dockerListAll": {
    toolName: "docker_list_all",
    description: "List all Docker containers",
  },
  "tool.dockerBulkRestart": {
    toolName: "docker_bulk_restart",
    description: "Restart multiple containers",
  },
  "tool.dockerBulkLogs": {
    toolName: "docker_bulk_logs",
    description: "Fetch logs from multiple containers",
  },
  "tool.dockerStop": {
    toolName: "docker_stop",
    description: "Stop a Docker container",
  },
  "tool.dockerStart": {
    toolName: "docker_start",
    description: "Start a Docker container",
  },
  "tool.dockerRemove": {
    toolName: "docker_remove",
    description: "Remove a Docker container",
  },
  "tool.dockerPruneSystem": {
    toolName: "docker_prune_system",
    description: "Docker system prune",
  },
  "tool.healthCheckScanner": {
    toolName: "health_check_scanner",
    description: "Scan containers for health issues",
  },
  "tool.slackNotify": {
    toolName: "slack_notify",
    description: "Send Slack notification",
  },
  "agent.aiAnalyzer": {
    toolName: "ai_analyze_logs",
    description: "Analyze logs with AI",
  },
};

// Get all available tools
router.get("/", async (req, res) => {
  try {
    const tools = Object.entries(TOOL_DEFINITIONS).map(
      ([nodeType, toolDef]) => ({
        nodeType,
        server: "agent-mesh-tools",
        toolName: toolDef.toolName,
        status: "connected",
        connected: true,
        description: toolDef.description,
      }),
    );

    res.json({
      success: true,
      tools,
    });
  } catch (error: any) {
    console.error("Error fetching tools:", error);
    res.status(500).json({
      error: "Failed to fetch tools",
      message: error.message,
    });
  }
});

// Test a specific tool
router.post("/test/:nodeType", async (req, res) => {
  try {
    const { nodeType } = req.params;
    const config = req.body;

    const toolDef = TOOL_DEFINITIONS[nodeType as keyof typeof TOOL_DEFINITIONS];
    if (!toolDef) {
      return res.status(404).json({
        error: "Tool not found",
      });
    }

    const result = await executeMCPTool(nodeType, config);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error testing tool:", error);
    res.status(500).json({
      success: false,
      error: "Tool test failed",
      message: error.message,
    });
  }
});

export default router;
