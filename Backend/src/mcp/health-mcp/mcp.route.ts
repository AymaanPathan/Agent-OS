/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { runHttpHealthCheck } from "../../engine/tools/httpHealth.tool";

import {
  runDockerStatus,
  runDockerLogs,
  runDockerRestart,
  runDockerRollback,
  runDockerListAll,
  runDockerBulkRestart,
  runDockerBulkLogs,
} from "../../engine/tools/docker.tool";

import {
  runDockerStop,
  runDockerStart,
  runDockerRemove,
  runDockerPruneSystem,
} from "../../engine/tools/docker.extra.tool";

import { runSlackNotify } from "../../engine/tools/slack.tool";

import { runAILogAnalysis } from "../../engine/tools/aiAnalyzer.tool";
import { monitorManager } from "../../engine/tools/monitor.tool";
import { runHealthCheckScanner } from "../../engine/tools/healthCheckScanner.tool";

// ✅ One MCP server for ALL tools
const mcpServer = new McpServer(
  { name: "agent-mesh-tools", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ===================================
// ✅ HTTP HEALTH TOOL
// ===================================
mcpServer.registerTool(
  "check_http_health",
  {
    description: "Check API health using HTTP GET",
    inputSchema: {
      url: z.string(),
      expectedStatus: z.number().default(200),
      timeout: z.number().default(5000),
      retries: z.number().optional(),
      retryDelay: z.number().optional(),
    },
  },
  async (args) => {
    const result = await runHttpHealthCheck({
      url: args.url,
      expectedStatus: args.expectedStatus,
      timeout: args.timeout,
      retries: args.retries,
      retryDelay: args.retryDelay,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ===================================
// ✅ DOCKER TOOLS
// ===================================
mcpServer.registerTool(
  "docker_status",
  {
    description: "Check docker container status",
    inputSchema: { containerName: z.string() },
  },
  async (args) => {
    const result = await runDockerStatus({ containerName: args.containerName });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_logs",
  {
    description: "Fetch docker logs",
    inputSchema: {
      containerName: z.string(),
      tail: z.number().default(100),
      since: z.string().optional(),
      timestamps: z.boolean().default(false),
    },
  },
  async (args) => {
    const result = await runDockerLogs({
      containerName: args.containerName,
      tail: args.tail,
      // since: args.since,
      timestamps: args.timestamps,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_restart",
  {
    description: "Restart a docker container",
    inputSchema: {
      containerName: z.string(),
      timeout: z.number().optional(),
    },
  },
  async (args) => {
    const result = await runDockerRestart({
      containerName: args.containerName,
      timeout: args.timeout,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// Add after existing tools, before export

// ===================================
// ✅ ENHANCED MONITOR TOOLS
// ===================================
mcpServer.registerTool(
  "monitor_start",
  {
    description: "Start advanced continuous monitor with AI auto-fix",
    inputSchema: {
      monitorId: z.string(),
      targets: z.enum(["containers", "apis", "resources"]),
      interval: z.number().default(30),
      autoFix: z.boolean().default(true),
      alertOnChange: z.boolean().default(true),
      containerFilters: z.string().optional(),
      thresholds: z
        .object({
          cpu: z.number().default(80),
          memory: z.number().default(80),
          restartCount: z.number().default(3),
        })
        .optional(),
    },
  },
  async (args) => {
    const existing = monitorManager.get(args.monitorId);
    if (existing) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: "Monitor already running" },
              null,
              2,
            ),
          },
        ],
      };
    }

    const monitor = monitorManager.create(args.monitorId, {
      targets: args.targets,
      interval: args.interval,
      autoFix: args.autoFix,
      alertOnChange: args.alertOnChange,
      containerFilters: args.containerFilters,
      thresholds: args.thresholds,
    });

    // Forward events to client
    monitor.on("alert", (alert) => {
      console.log("🚨 [Monitor] Alert:", alert);
    });

    monitor.on("auto_fix_attempted", ({ alert, result }) => {
      console.log("🤖 [Monitor] Auto-fix attempted:", result);
    });

    await monitor.start();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              monitorId: args.monitorId,
              status: "running",
              autoFixEnabled: args.autoFix,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "monitor_get_metrics",
  {
    description: "Get current metrics for all monitored containers",
    inputSchema: { monitorId: z.string() },
  },
  async (args) => {
    const monitor = monitorManager.get(args.monitorId);
    if (!monitor) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: "Monitor not found" },
              null,
              2,
            ),
          },
        ],
      };
    }

    const state = monitor.getState();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              metrics: Array.from(state.containerMetrics.values()),
              totalContainers: state.containerMetrics.size,
              healthyCount: Array.from(state.containerMetrics.values()).filter(
                (m) => m.severity === "healthy",
              ).length,
              warningCount: Array.from(state.containerMetrics.values()).filter(
                (m) => m.severity === "warning",
              ).length,
              criticalCount: Array.from(state.containerMetrics.values()).filter(
                (m) => m.severity === "critical",
              ).length,
              autoFixesApplied: state.autoFixesApplied,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "monitor_get_alerts",
  {
    description: "Get recent alerts from monitor",
    inputSchema: {
      monitorId: z.string(),
      limit: z.number().default(50),
      severity: z.enum(["info", "warning", "critical"]).optional(),
    },
  },
  async (args) => {
    const monitor = monitorManager.get(args.monitorId);
    if (!monitor) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: "Monitor not found" },
              null,
              2,
            ),
          },
        ],
      };
    }

    const state = monitor.getState();
    let alerts = state.alerts;

    if (args.severity) {
      alerts = alerts.filter((a) => a.severity === args.severity);
    }

    alerts = alerts.slice(-args.limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              alerts,
              totalAlerts: alerts.length,
              criticalAlerts: alerts.filter((a) => a.severity === "critical")
                .length,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);
mcpServer.registerTool(
  "docker_rollback",
  {
    description: "Rollback docker container to previous image",
    inputSchema: {
      containerName: z.string(),
      rollbackImage: z.string(),
      timeout: z.number().optional(),
      preserveVolumes: z.boolean().optional(),
      preserveNetwork: z.boolean().optional(),
    },
  },
  async (args) => {
    const result = await runDockerRollback({
      containerName: args.containerName,
      rollbackImage: args.rollbackImage,
      // timeout: args.timeout,
      preserveVolumes: args.preserveVolumes,
      preserveNetwork: args.preserveNetwork,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_list_all",
  {
    description: "List all containers with unhealthy list",
    inputSchema: {
      filters: z.string().optional(),
      includeStats: z.boolean().default(false),
      checkHttpHealth: z.boolean().default(false),
      httpHealthPorts: z.record(z.string(), z.number()).optional(),
    },
  },
  async (args) => {
    const result = (await runDockerListAll({
      filters: args.filters,
      includeStats: args.includeStats,
    })) as any;
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "health_check_scanner",
  {
    description: "Scan docker containers and perform HTTP health checks",
    inputSchema: {
      containerNames: z
        .array(z.string())
        .optional()
        .transform((arr) =>
          arr
            ?.filter(
              (name): name is string =>
                name != null &&
                typeof name === "string" &&
                name.trim().length > 0,
            )
            .map((name) => name.trim()),
        ),
      scanAllRunning: z.boolean().default(false),
      timeout: z.number().default(3000),
    },
  },
  async (args) => {
    const result = await runHealthCheckScanner({
      containerNames: args.containerNames,
      scanAllRunning: args.scanAllRunning,
      timeout: args.timeout,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "docker_bulk_restart",
  {
    description: "Bulk restart multiple containers",
    inputSchema: {
      containerNames: z.array(z.string()),
      timeout: z.number().optional(),
      continueOnError: z.boolean().default(true),
    },
  },
  async (args) => {
    const result = await runDockerBulkRestart({
      containerNames: args.containerNames,
      timeout: args.timeout,
      continueOnError: args.continueOnError,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_bulk_logs",
  {
    description: "Bulk fetch logs for multiple containers",
    inputSchema: {
      containerNames: z.array(z.string()),
      tail: z.number().optional(),
      since: z.string().optional(),
    },
  },
  async (args) => {
    const result: any = (await runDockerBulkLogs({
      containerNames: args.containerNames,
      tail: args.tail,
    })) as any;
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ===================================
// ✅ EXTRA DOCKER TOOLS
// ===================================
mcpServer.registerTool(
  "docker_stop",
  {
    description: "Stop a container",
    inputSchema: { containerName: z.string() },
  },
  async (args) => {
    const result = await runDockerStop({ containerName: args.containerName });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_start",
  {
    description: "Start a container",
    inputSchema: { containerName: z.string() },
  },
  async (args) => {
    const result = await runDockerStart({ containerName: args.containerName });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_remove",
  {
    description: "Remove a container",
    inputSchema: {
      containerName: z.string(),
      force: z.boolean().default(true),
    },
  },
  async (args) => {
    const result = await runDockerRemove({
      containerName: args.containerName,
      force: args.force,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "docker_prune_system",
  {
    description: "Docker system prune (dangling images, unused networks etc.)",
    inputSchema: { all: z.boolean().default(false) },
  },
  async (args) => {
    const result = await runDockerPruneSystem({ all: args.all });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ===================================
// ✅ SLACK TOOL
// ===================================
mcpServer.registerTool(
  "slack_notify",
  {
    description: "Send Slack message via webhook",
    inputSchema: {
      message: z.string(),
      channel: z.string().optional(),
      username: z.string().optional(),
      severity: z.enum(["info", "success", "warning", "error"]).optional(),
      includeLogSnippet: z.boolean().optional(),
      logSnippet: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    },
  },
  async (args) => {
    const result = await runSlackNotify({
      webhookUrl: process.env.SLACK_WEBHOOK_URL!,
      message: args.message,
      channel: args.channel,
      username: args.username,
      severity: args.severity,
      includeLogSnippet: args.includeLogSnippet,
      logSnippet: args.logSnippet,
      metadata: args.metadata,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ===================================
// ✅ AI ANALYZER TOOL
// ===================================
mcpServer.registerTool(
  "ai_analyze_logs",
  {
    description: "Analyze container logs using Groq AI",
    inputSchema: {
      logs: z.union([z.string(), z.record(z.string(), z.string())]),
      context: z.string().optional(),
      model: z.string().optional(),
    },
  },
  async (args) => {
    const result = await runAILogAnalysis({
      logs: args.logs,
      context: args.context,
      provider: "groq",
      model: args.model || "llama-3.3-70b-versatile",
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ===================================
// ✅ MONITOR TOOLS
// ===================================
mcpServer.registerTool(
  "monitor_start",
  {
    description: "Start continuous monitor",
    inputSchema: {
      monitorId: z.string(),
      targets: z.enum(["containers", "apis", "resources"]),
      interval: z.number().default(30),
      alertOnChange: z.boolean().default(true),
      containerFilters: z.string().optional(),
      apiEndpoints: z
        .array(
          z.object({
            url: z.string(),
            expectedStatus: z.number().default(200),
          }),
        )
        .optional(),
    },
  },
  async (args) => {
    const existing = monitorManager.get(args.monitorId);
    if (existing) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: "Monitor already running" },
              null,
              2,
            ),
          },
        ],
      };
    }

    const monitor = monitorManager.create(args.monitorId, {
      targets: args.targets,
      interval: args.interval,
      alertOnChange: args.alertOnChange,
      containerFilters: args.containerFilters,
      apiEndpoints: args.apiEndpoints,
    });

    await monitor.start();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, monitorId: args.monitorId, status: "running" },
            null,
            2,
          ),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "monitor_stop",
  {
    description: "Stop monitor",
    inputSchema: { monitorId: z.string() },
  },
  async (args) => {
    const stopped = monitorManager.stop(args.monitorId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: stopped, monitorId: args.monitorId },
            null,
            2,
          ),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "monitor_status",
  {
    description: "Get monitor current state",
    inputSchema: { monitorId: z.string() },
  },
  async (args) => {
    const monitor = monitorManager.get(args.monitorId);
    if (!monitor) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: "Monitor not found" },
              null,
              2,
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: true, state: monitor.getState() },
            null,
            2,
          ),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "monitor_list",
  {
    description: "List all active monitors",
    inputSchema: {},
  },
  async () => {
    const list = monitorManager.list();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, monitors: list }, null, 2),
        },
      ],
    };
  },
);

// ===================================
// ✅ ENHANCED MCP HANDLER
// ===================================
export async function handleMcp(req: Request, res: Response) {
  try {
    console.log("📨 MCP Request received");

    // Create transport - it will handle reading the raw stream
    const transport = new StreamableHTTPServerTransport(req as any);

    // Connect the MCP server to the transport
    await mcpServer.connect(transport);

    // Handle the request - transport manages everything
    return transport.handleRequest(req, res);
  } catch (error: any) {
    console.error("❌ MCP Handler Error:", error);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`,
      },
      id: null,
    });
  }
}
