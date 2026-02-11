/* eslint-disable @typescript-eslint/no-explicit-any */
//  backend
import { Run } from "../models/run.model";
import { extractTemplateVariables, SocketLogger } from "../lib/sockerLogger";
import { monitorManager } from "../engine/tools/monitor.tool";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";

import {
  evaluateRouteCondition,
  findMatchingRoute,
  resolveNextStep,
  getFallbackRoutes,
  supportsFallbackRouting,
} from "../lib/Nodefallbackroutes.backend";
import { callA2AAgent } from "../engine/tools/a2a.client";
import { io } from "../lib/socket";

// ====================================
// 🎯 ENHANCED RUN CONTEXT
// ====================================
function getToolName(nodeType: string): string {
  const nameMap: Record<string, string> = {
    "tool.httpHealth": "HTTP Health Check",
    "tool.dockerStatus": "Docker Status Check",
    "tool.dockerLogs": "Docker Logs",
    "tool.dockerRestart": "Docker Restart",
    "tool.dockerRollback": "Docker Rollback",
    "tool.dockerListAll": "List All Containers",
    "tool.dockerBulkRestart": "Bulk Restart Containers",
    "tool.dockerBulkLogs": "Bulk Fetch Logs",
    "tool.slackNotify": "Slack Notify",
    "agent.aiAnalyzer": "AI Log Analyzer",
    "logic.approval": "Approval Gate",
    "monitor.continuous": "Continuous Monitor",
    "tool.healthCheckScanner": "Health Check Scanner",
    "agent.delegate": "Agent Delegate",
  };

  return nameMap[nodeType] || nodeType;
}

export type RunStatus = "running" | "success" | "failed" | "paused";

export type RunContext = {
  runId: string;
  lastOutput: any;
  lastNodeId?: string;
  lastNodeType?: string;
  outputsByNodeId: Record<string, any>;
  vars: Record<string, any>;
  status: RunStatus;
  errors: Array<{
    nodeId: string;
    message: string;
    timestamp: string;
  }>;
  startedAt: string;
  completedAt?: string;
  duration?: number;
};

// ====================================
// 🏗️ CREATE RUN CONTEXT
// ====================================

export function createRunContext(runId: string): RunContext {
  console.log("📦 [Context] Creating new run context for:", runId);
  return {
    runId,
    lastOutput: null,
    outputsByNodeId: {},
    vars: {},
    status: "running",
    errors: [],
    startedAt: new Date().toISOString(),
  };
}

// ====================================
// 🔍 DEEP VALUE GETTER
// ====================================

function getDeepValue(obj: any, path: string): any {
  if (!obj || !path) {
    console.log("⚠️ [DeepValue] Invalid input - obj:", !!obj, "path:", path);
    return undefined;
  }

  const keys = path.split(".");
  let current = obj;

  console.log("🔍 [DeepValue] Traversing path:", path, "Keys:", keys);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (current === null || current === undefined) {
      console.log(`⚠️ [DeepValue] Null/undefined at key "${key}" (index ${i})`);
      return undefined;
    }
    current = current[key];
    console.log(
      `  ✓ [DeepValue] ${key} =>`,
      typeof current,
      Array.isArray(current) ? `(array length: ${current.length})` : "",
    );
  }

  console.log(
    "✅ [DeepValue] Final value:",
    typeof current,
    Array.isArray(current) ? `(array)` : current,
  );
  return current;
}

function parseStepExpression(
  expr: string,
  context: RunContext,
): { nodeId: string; path: string } {
  const availableNodeIds = Object.keys(context.outputsByNodeId);
  console.log("🔍 [ParseExpr] Parsing expression:", expr);
  console.log("🔍 [ParseExpr] Available node IDs:", availableNodeIds);

  for (const nodeId of availableNodeIds) {
    if (expr === nodeId) {
      console.log("✅ [ParseExpr] Exact node ID match:", nodeId);
      return { nodeId, path: "" };
    }

    if (expr.startsWith(nodeId + ".")) {
      const path = expr.substring(nodeId.length + 1);
      console.log("✅ [ParseExpr] Node ID with path:", nodeId, "path:", path);
      return { nodeId, path };
    }
  }

  const parts = expr.split(".");
  if (parts.length === 1) {
    console.log("⚠️ [ParseExpr] Single part, treating as node ID:", expr);
    return { nodeId: expr, path: "" };
  }

  const path = parts[parts.length - 1];
  const nodeId = parts.slice(0, -1).join(".");
  console.log("⚠️ [ParseExpr] Fallback parse - nodeId:", nodeId, "path:", path);

  return { nodeId, path };
}

// ====================================
// 🔄 TEMPLATE RESOLVER
// ====================================

export function resolveTemplateString(
  input: string,
  context: RunContext,
): string | any {
  // 🔥 Changed return type to allow arrays/objects
  console.log("🔄 [Template] Resolving template:", input);

  // 🔥 NEW: Check if input is a single template variable (no other text)
  const singleTemplateMatch = input.match(/^\{\{(.+)\}\}$/);

  if (singleTemplateMatch) {
    const expr = singleTemplateMatch[1].trim();
    console.log("🔄 [Template] Single template variable detected:", expr);

    let value: any;

    if (expr.startsWith("last.")) {
      const path = expr.replace("last.", "");
      value = getDeepValue(context.lastOutput, path);
    } else if (expr.startsWith("step.")) {
      const withoutPrefix = expr.replace("step.", "");
      const { nodeId, path } = parseStepExpression(withoutPrefix, context);
      const output = context.outputsByNodeId[nodeId];

      if (output) {
        value = path ? getDeepValue(output, path) : output;
      }
    } else if (expr.startsWith("var.")) {
      const path = expr.replace("var.", "");
      value = getDeepValue(context.vars, path);
    } else if (expr === "run.id") {
      value = context.runId;
    } else if (expr === "run.status") {
      value = context.status;
    } else if (expr === "run.startedAt") {
      value = context.startedAt;
    }

    // 🔥 CRITICAL FIX: Return value as-is for arrays and objects
    // Don't convert to string - let it pass through
    if (Array.isArray(value) || typeof value === "object") {
      console.log(
        "✅ [Template] Returning array/object directly:",
        typeof value,
        Array.isArray(value) ? `(array)` : `(object)`,
      );
      return value;
    }

    // For primitives, convert to string
    console.log("✅ [Template] Single value resolved:", value);
    return value !== undefined ? String(value) : "";
  }

  // Original multi-variable template logic (join arrays with commas)
  const result = input.replace(/\{\{(.*?)\}\}/g, (match, expr: string) => {
    const trimmed = expr.trim();
    console.log("  🎯 [Template] Processing variable:", trimmed);

    if (trimmed.startsWith("last.")) {
      const path = trimmed.replace("last.", "");
      console.log("    📌 [Template] Last output path:", path);
      const value = getDeepValue(context.lastOutput, path);
      const resolved = value !== undefined ? String(value) : "";
      console.log("    ✅ [Template] Resolved to:", resolved);
      return resolved;
    }

    if (trimmed.startsWith("step.")) {
      const withoutPrefix = trimmed.replace("step.", "");
      console.log("    📌 [Template] Step reference:", withoutPrefix);
      const { nodeId, path } = parseStepExpression(withoutPrefix, context);
      const output = context.outputsByNodeId[nodeId];
      console.log("    📊 [Template] Node output exists:", !!output);

      if (!output) {
        console.log("    ⚠️ [Template] No output for node:", nodeId);
        return "";
      }

      if (!path) {
        const result =
          typeof output === "object" ? JSON.stringify(output) : String(output);
        console.log("    ✅ [Template] Full output (stringified)");
        return result;
      }

      const value = getDeepValue(output, path);
      // 🔥 Arrays get joined with commas when embedded in text
      const resolved =
        value !== undefined
          ? Array.isArray(value)
            ? value.join(",")
            : String(value)
          : "";
      console.log("    ✅ [Template] Resolved to:", resolved);
      return resolved;
    }

    if (trimmed.startsWith("var.")) {
      const path = trimmed.replace("var.", "");
      console.log("    📌 [Template] Variable path:", path);
      const value = getDeepValue(context.vars, path);
      // 🔥 Arrays get joined with commas when embedded in text
      const resolved =
        value !== undefined
          ? Array.isArray(value)
            ? value.join(",")
            : String(value)
          : "";
      console.log("    ✅ [Template] Resolved to:", resolved);
      return resolved;
    }

    if (trimmed === "run.id") return context.runId;
    if (trimmed === "run.status") return context.status;
    if (trimmed === "run.startedAt") return context.startedAt;

    console.log("    ⚠️ [Template] Unknown variable type, returning empty");
    return "";
  });

  console.log("✅ [Template] Final result:", result);
  return result;
}

// ====================================
// 🔧 CONFIG RESOLVER (RECURSIVE)
// ====================================

export function resolveConfig<T>(config: T, context: RunContext): T {
  console.log("🔧 [Config] Resolving config, type:", typeof config);

  if (config === null || config === undefined) {
    console.log("  ⚠️ [Config] Null/undefined config");
    return config;
  }

  if (typeof config === "string") {
    const resolved = resolveTemplateString(config, context);
    console.log(
      "  ✅ [Config] String resolved:",
      typeof resolved === "object" ? "[Object]" : resolved,
    );
    // 🔥 IMPORTANT: Return the resolved value as-is (could be string, array, or object)
    return resolved as any;
  }

  if (Array.isArray(config)) {
    console.log("  📋 [Config] Array with", config.length, "items");
    const resolved = config.map((item, index) => {
      console.log(
        `    🔸 [Config] Resolving array item ${index}:`,
        typeof item,
      );
      return resolveConfig(item, context);
    });
    console.log("  ✅ [Config] Array resolved:", resolved);
    return resolved as any;
  }

  if (typeof config === "object") {
    console.log("  📦 [Config] Object with keys:", Object.keys(config as any));
    const resolved: any = {};
    for (const key of Object.keys(config as any)) {
      console.log(`    🔸 [Config] Resolving key "${key}"`);
      resolved[key] = resolveConfig((config as any)[key], context);
    }
    console.log("  ✅ [Config] Object resolved");
    return resolved;
  }

  console.log("  ✅ [Config] Primitive value, returning as-is:", config);
  return config;
}
// ====================================
// 💾 SAVE OUTPUT TO CONTEXT
// ====================================

export function saveToContext(params: {
  context: RunContext;
  nodeId: string;
  nodeType: string;
  output: any;
}): void {
  const { context, nodeId, nodeType, output } = params;

  console.log(
    "💾 [SaveContext] Saving output for node:",
    nodeId,
    "Type:",
    nodeType,
  );
  console.log("💾 [SaveContext] Raw output:", JSON.stringify(output, null, 2));

  context.lastOutput = output;
  context.lastNodeId = nodeId;
  context.lastNodeType = nodeType;
  context.outputsByNodeId[nodeId] = output;

  // 🔥 FIX: Extract unhealthy containers as string array
  if (nodeType === "tool.healthCheckScanner" && output.unhealthyContainers) {
    console.log("🔧 [SaveContext] Processing healthCheckScanner output");
    console.log(
      "🔧 [SaveContext] Raw unhealthyContainers:",
      output.unhealthyContainers,
    );

    // Ensure it's an array of strings
    const unhealthyContainers = Array.isArray(output.unhealthyContainers)
      ? output.unhealthyContainers
          .filter(
            (name: any) => typeof name === "string" && name.trim().length > 0,
          )
          .map((name: any) => name.trim())
      : [];

    console.log(
      "✅ [SaveContext] Cleaned unhealthyContainers:",
      unhealthyContainers,
    );

    context.vars.scannedContainers = output.scannedCount || 0;
    context.vars.healthyContainers = output.healthyCount || 0;
    context.vars.unhealthyContainers = output.unhealthyCount || 0;
    context.vars.unhealthyContainerNames = unhealthyContainers; // Clean array
    context.vars.healthReports = output.reports || [];
  }

  // Auto-populate useful vars from specific node types
  if (nodeType === "tool.dockerLogs") {
    context.vars.lastLogs = output.logs || "";
    context.vars.lastLogsCount = output.lineCount || 0;
    context.vars.lastLogsContainer = output.containerName || "";
    console.log("📝 [SaveContext] Saved docker logs vars");
  }

  if (nodeType === "tool.dockerStatus") {
    context.vars.lastContainer = output.containerName || "";
    context.vars.lastContainerRunning = output.isRunning || false;
    context.vars.lastContainerState = output.state || "";
    context.vars.lastContainerUptime = output.uptime || "";
    console.log("📝 [SaveContext] Saved docker status vars");
  }

  if (nodeType === "tool.httpHealth") {
    context.vars.lastHealthUrl = output.url || "";
    context.vars.lastHealthPass = output.pass || false;
    context.vars.lastHealthStatusCode = output.statusCode || 0;
    context.vars.lastLatency = output.latency || 0;
    console.log("📝 [SaveContext] Saved HTTP health vars");
  }

  if (nodeType === "tool.dockerListAll") {
    console.log("🔧 [SaveContext] Processing dockerListAll output");

    // Clean unhealthy containers array
    const unhealthyContainers = Array.isArray(output.unhealthyContainers)
      ? output.unhealthyContainers
          .filter(
            (name: any) => typeof name === "string" && name.trim().length > 0,
          )
          .map((name: any) => name.trim())
      : [];

    console.log(
      "✅ [SaveContext] Cleaned unhealthyContainers:",
      unhealthyContainers,
    );

    context.vars.totalContainers = output.totalCount || 0;
    context.vars.healthyContainers = output.healthyCount || 0;
    context.vars.unhealthyContainers = output.unhealthyCount || 0;
    context.vars.unhealthyContainerNames = unhealthyContainers;
  }

  if (nodeType === "agent.aiAnalyzer") {
    context.vars.aiSummary = output.summary || "";
    context.vars.aiRootCause = output.rootCause || "";
    context.vars.aiConfidence = output.confidence || "low";
    context.vars.aiErrorCategory = output.errorCategory || "unknown";
    console.log("📝 [SaveContext] Saved AI analyzer vars");
  }

  if (nodeType === "logic.approval") {
    context.vars.lastApprovalResult = output.approved || false;
    console.log("📝 [SaveContext] Saved approval vars");
  }

  if (nodeType === "tool.dockerBulkLogs") {
    context.vars.bulkLogs = output.logs || {};
    context.vars.totalContainersWithLogs = output.totalContainers || 0;

    // Flatten logs for easier template access
    if (output.logs) {
      Object.entries(output.logs).forEach(([containerName, logs]) => {
        context.vars[`logs_${containerName}`] = logs;
      });
    }
    console.log("📝 [SaveContext] Saved bulk logs vars");
  }

  console.log(
    "💾 [SaveContext] Context vars after save:",
    Object.keys(context.vars),
  );
}

// ====================================
// ⏸️ APPROVAL GATE WAITER SYSTEM
// ====================================

const approvalWaiters = new Map<
  string,
  {
    resolve: (result: "approved" | "rejected") => void;
    reject: (err: Error) => void;
  }
>();

export function waitForApproval(
  runId: string,
): Promise<"approved" | "rejected"> {
  console.log("⏸️ [Approval] Waiting for approval, runId:", runId);
  return new Promise((resolve, reject) => {
    approvalWaiters.set(runId, { resolve, reject });
  });
}

export function sendApproval(
  runId: any,
  result: "approved" | "rejected",
): boolean {
  console.log(
    "✅ [Approval] Sending approval result:",
    result,
    "runId:",
    runId,
  );
  const waiter = approvalWaiters.get(runId);
  if (!waiter) {
    console.log("⚠️ [Approval] No waiter found for runId:", runId);
    return false;
  }

  waiter.resolve(result);
  approvalWaiters.delete(runId);
  console.log("✅ [Approval] Approval delivered and waiter removed");
  return true;
}

// ====================================
// 🎯 ENHANCED FALLBACK ROUTE EVALUATION
// ====================================

function evaluateEnhancedFallbackRoutes(
  currentNodeId: string,
  nodeType: string,
  output: any,
  config: any,
  context: RunContext,
  logger: SocketLogger,
): string | null {
  console.log(
    "🔀 [Routes] Evaluating fallback routes for node:",
    currentNodeId,
  );
  console.log("🔀 [Routes] Node type:", nodeType);
  console.log("🔀 [Routes] Output:", JSON.stringify(output, null, 2));

  // Check if this node type supports fallback routing
  if (!supportsFallbackRouting(nodeType)) {
    logger.log(
      "debug",
      `Node type ${nodeType} doesn't support fallback routing`,
    );

    // Fall back to default route if specified
    if (config.defaultRoute) {
      console.log("📍 [Routes] Using default route:", config.defaultRoute);
      logger.log("info", `📍 Using default route: ${config.defaultRoute}`);
      return config.defaultRoute;
    }
    console.log("📍 [Routes] No fallback routes or default route");
    return null;
  }

  const configuredRoutes = config.fallbackRoutes || [];
  console.log("🔀 [Routes] Configured routes count:", configuredRoutes.length);

  if (configuredRoutes.length === 0) {
    logger.log("debug", "No fallback routes configured");

    if (config.defaultRoute) {
      console.log("📍 [Routes] Using default route:", config.defaultRoute);
      logger.log("info", `📍 Using default route: ${config.defaultRoute}`);
      return config.defaultRoute;
    }
    return null;
  }

  // Log available routes for this node type
  const availableRoutes = getFallbackRoutes(nodeType);
  logger.log(
    "info",
    `🔀 Evaluating ${configuredRoutes.length} fallback routes for ${nodeType}`,
  );
  logger.log(
    "debug",
    `Available route templates:`,
    availableRoutes.map((r) => r.label),
  );

  // Use the new routing system
  const matchedStepId = findMatchingRoute(nodeType, output, configuredRoutes);

  if (matchedStepId) {
    const matchedRoute = configuredRoutes.find(
      (r: any) => r.targetStepId === matchedStepId,
    );
    const routeTemplate = availableRoutes.find(
      (r) => r.id === matchedRoute?.id,
    );

    console.log("✅ [Routes] Route matched! Target:", matchedStepId);
    logger.log(
      "success",
      `✅ Route matched: ${routeTemplate?.label || "Unknown"} → ${matchedStepId}`,
    );
    logger.log(
      "debug",
      `Route severity: ${routeTemplate?.severity}, icon: ${routeTemplate?.icon}`,
    );

    return matchedStepId;
  }

  // No routes matched - use default
  if (config.defaultRoute) {
    console.log("📍 [Routes] No match, using default:", config.defaultRoute);
    logger.log(
      "info",
      `📍 No routes matched - using default: ${config.defaultRoute}`,
    );
    return config.defaultRoute;
  }

  console.log("📍 [Routes] No match, no default, continuing");
  logger.log("info", `📍 No routes matched - continuing to next step`);
  return null;
}

// ====================================
// 🚀 ENHANCED WORKFLOW EXECUTION
// ====================================

function buildGraph(nodes: any[], edges: any[] = []) {
  console.log(
    "🏗️ [Graph] Building graph with",
    nodes.length,
    "nodes and",
    edges.length,
    "edges",
  );

  const nodeMap = new Map<string, any>();
  nodes.forEach((n) => {
    nodeMap.set(n.id, n);
    console.log(
      "  📍 [Graph] Registered node:",
      n.id,
      "Type:",
      n.data?.nodeType,
    );
  });

  const outgoing = new Map<string, any[]>();
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
    console.log("  🔗 [Graph] Edge:", e.source, "→", e.target);
  });

  return { nodeMap, outgoing };
}

function findStartNode(nodes: any[], edges: any[] = []) {
  console.log("🔍 [Graph] Finding start node");

  const incomingCount: Record<string, number> = {};

  nodes.forEach((n) => (incomingCount[n.id] = 0));
  edges.forEach((e) => {
    if (incomingCount[e.target] === undefined) incomingCount[e.target] = 0;
    incomingCount[e.target]++;
  });

  console.log("📊 [Graph] Incoming edge counts:", incomingCount);

  const startNode = nodes.find((n) => incomingCount[n.id] === 0);

  if (startNode) {
    console.log(
      "✅ [Graph] Start node found:",
      startNode.id,
      "Type:",
      startNode.data?.nodeType,
    );

    if (startNode.data?.nodeType?.startsWith("monitor.")) {
      console.log(
        "✅ [Graph] Starting workflow with monitor node:",
        startNode.data.label,
      );
    }
  } else {
    console.log("⚠️ [Graph] No start node found!");
  }

  return startNode;
}

export async function executeWorkflow(
  runId: string,
  nodes: any[],
  edges: any[],
  workflowName?: string,
) {
  console.log("\n");
  console.log("=".repeat(80));
  console.log("🚀 WORKFLOW EXECUTION START");
  console.log("=".repeat(80));
  console.log("📋 Workflow Name:", workflowName || "Unnamed");
  console.log("🆔 Run ID:", runId);
  console.log("📊 Total Nodes:", nodes.length);
  console.log("🔗 Total Edges:", edges.length);
  console.log("=".repeat(80));
  console.log("\n");

  const logger = new SocketLogger(runId);
  const context = createRunContext(runId);

  const workflowStartTime = Date.now();

  logger.workflowStarted(nodes.length, workflowName);
  logger.log("info", `📊 Workflow ID: ${runId}`);
  logger.log("info", `📦 Total nodes: ${nodes.length}`);

  let successCount = 0;
  const { nodeMap, outgoing } = buildGraph(nodes, edges || []);

  let currentNode = findStartNode(nodes, edges || []);

  if (!currentNode) {
    const monitorNode = nodes.find((n) =>
      n.data?.nodeType?.startsWith("monitor."),
    );

    if (monitorNode) {
      console.log("🔄 [Workflow] Starting with monitor node");
      currentNode = monitorNode;
    } else {
      console.log("❌ [Workflow] FATAL: No valid start node found!");
      throw new Error("❌ No valid start node found!");
    }
  }

  let stepIndex = 0;
  const totalSteps = nodes.length;

  while (currentNode) {
    stepIndex++;
    const node = currentNode;
    const nodeId = node.id;
    const nodeType = node.data?.nodeType;
    const label = node.data?.label || "Unknown Node";

    console.log("\n");
    console.log("-".repeat(80));
    console.log(`🎯 STEP ${stepIndex}/${totalSteps}`);
    console.log("-".repeat(80));
    console.log("📌 Node ID:", nodeId);
    console.log("🔧 Node Type:", nodeType);
    console.log("🏷️  Label:", label);
    console.log("-".repeat(80));
    console.log("\n");

    const nodeStartTime = Date.now();
    logger.nodeStarted(nodeId, nodeType, label, stepIndex, totalSteps);

    try {
      // ====================================
      // RESOLVE CONFIGURATION
      // ====================================

      const rawConfig = node.data?.config || {};

      console.log("📋 [Config] Raw configuration:");
      console.log(JSON.stringify(rawConfig, null, 2));

      logger.configResolving(nodeId, rawConfig);
      logger.debug(nodeId, "Raw configuration", rawConfig);

      const templateVars = extractTemplateVariables(rawConfig);
      if (templateVars.length > 0) {
        console.log("🔍 [Config] Template variables found:", templateVars);
        logger.log(
          "debug",
          `🔍 Found ${templateVars.length} template variables`,
          templateVars,
        );
      }

      const config = resolveConfig(rawConfig, context);

      console.log("✅ [Config] Resolved configuration:");
      console.log(JSON.stringify(config, null, 2));

      logger.configResolved(nodeId, config, templateVars);
      logger.debug(nodeId, "Resolved configuration", config);

      // ====================================
      // EXECUTE NODE
      // ====================================

      let output: any = null;
      let success = true;
      let message = "";

      console.log("⚙️ [Execution] Starting node execution");

      switch (nodeType) {
        case "tool.healthCheckScanner":
        case "tool.httpHealth":
        case "tool.dockerStatus":
        case "tool.dockerLogs":
        case "tool.dockerRestart":
        case "tool.dockerRollback":
        case "tool.dockerListAll":
        case "tool.dockerBulkRestart":
        case "tool.dockerBulkLogs":
        case "agent.aiAnalyzer": {
          const toolName = getToolName(nodeType);
          console.log("🔧 [Tool] Executing:", toolName);
          logger.toolStarted(toolName, nodeId, config);

          try {
            // 🔥 FIX: Normalize containerNames to ensure it's a clean array
            const normalizedConfig = {
              ...config,
              containerNames: (() => {
                if (!config.containerNames) {
                  console.log("⚠️ [Tool] No containerNames provided");
                  return [];
                }

                if (Array.isArray(config.containerNames)) {
                  const cleaned = config.containerNames
                    .filter((name: any) => {
                      const isValid =
                        name != null &&
                        typeof name === "string" &&
                        name.trim().length > 0;
                      if (!isValid) {
                        console.log(
                          "⚠️ [Tool] Filtered invalid container name:",
                          name,
                        );
                      }
                      return isValid;
                    })
                    .map((name: any) => name.trim());

                  console.log(
                    "✅ [Tool] Cleaned containerNames array:",
                    cleaned,
                  );
                  return cleaned;
                }

                // Single string
                const cleaned = [config.containerNames]
                  .filter(
                    (name: any) =>
                      name != null &&
                      typeof name === "string" &&
                      name.trim().length > 0,
                  )
                  .map((name: any) => name.trim());

                console.log(
                  "✅ [Tool] Normalized single containerName:",
                  cleaned,
                );
                return cleaned;
              })(),
            };

            console.log("📤 [Tool] Sending to MCP with normalized config:");
            console.log(JSON.stringify(normalizedConfig, null, 2));

            output = await executeMCPTool(nodeType, normalizedConfig);

            console.log("📥 [Tool] Received output from MCP:");
            console.log(JSON.stringify(output, null, 2));

            const toolSuccess =
              output?.success === true || output?.pass === true;
            success = toolSuccess;
            message = toolSuccess
              ? `✅ ${toolName} completed successfully`
              : `⚠️ ${toolName} failed`;

            console.log("📊 [Tool] Success:", toolSuccess);
            logger.toolCompleted(toolName, output, Date.now() - nodeStartTime);
          } catch (err: any) {
            success = false;
            message = `❌ ${toolName} failed: ${err.message}`;
            output = { success: false, error: err.message };
            console.log("❌ [Tool] Error:", err.message);
            logger.toolFailed(toolName, err.message);
          }
          break;
        }

        case "tool.slackNotify": {
          console.log("📢 [Slack] Preparing notification");
          logger.toolStarted("Slack Notify", nodeId, config);

          const enrichedConfig = {
            ...config,
            logSnippet:
              config.includeLogSnippet && context.vars.lastLogs
                ? String(context.vars.lastLogs)
                    .split("\n")
                    .slice(-20)
                    .join("\n")
                : undefined,
            metadata: {
              "Run ID": runId,
              "Previous Node": context.lastNodeType || "none",
              Timestamp: new Date().toLocaleString(),
              ...config.metadata,
            },
          };

          console.log("📤 [Slack] Enriched config:");
          console.log(JSON.stringify(enrichedConfig, null, 2));

          try {
            output = await executeMCPTool(nodeType, enrichedConfig);
            success = true;
            message = output.success
              ? `✅ Slack notification sent`
              : `⚠️ Slack notification failed`;

            console.log("📥 [Slack] Result:", message);

            if (output.success) {
              logger.toolCompleted(
                "Slack Notify",
                output,
                Date.now() - nodeStartTime,
              );
            } else {
              logger.toolFailed(
                "Slack Notify",
                output.error || "Notification failed",
              );
            }
          } catch (err: any) {
            success = true;
            message = `⚠️ Slack notification error: ${err.message}`;
            output = { success: false, error: err.message };
            console.log("❌ [Slack] Error:", err.message);
            logger.toolFailed("Slack Notify", err.message);
          }
          break;
        }

        // In your executeWorkflow.ts, update the monitor.continuous case:

        case "monitor.continuous": {
          console.log("👁️ [Monitor] Starting continuous monitor");
          logger.toolStarted("Continuous Monitor", nodeId, config);

          const monitor = monitorManager.create(nodeId, {
            targets: config.targets,
            interval: config.interval,
            alertOnChange: config.alertOnChange,
            autoFix: config.autoFix,
            containerFilters: config.containerFilters,
            apiEndpoints: config.apiEndpoints,
            runId, // ✅ Pass runId for socket emission
          });

          // ✅ CRITICAL: Setup socket bridge for real-time updates
          monitor.on("check_completed", (data) => {
            console.log(`📡 [Monitor] Broadcasting check to run: ${runId}`);

            // Emit to Socket.IO
            io.to(runId).emit("monitor_check_completed", {
              runId,
              checkNumber: monitor.getState().checkCount,
              timestamp: new Date().toISOString(),
              ...data,
            });
          });

          monitor.on("alert", (alert) => {
            console.log(`📡 [Monitor] Broadcasting alert to run: ${runId}`);

            io.to(runId).emit("monitor_alert", {
              runId,
              ...alert,
            });
          });

          monitor.on("started", (data) => {
            console.log(`📡 [Monitor] Broadcasting started to run: ${runId}`);

            io.to(runId).emit("monitor_started", {
              runId,
              config: data.config,
              timestamp: new Date().toISOString(),
            });
          });

          monitor.on("stopped", (data) => {
            console.log(`📡 [Monitor] Broadcasting stopped to run: ${runId}`);

            io.to(runId).emit("monitor_stopped", {
              runId,
              finalState: data.state,
              timestamp: new Date().toISOString(),
            });
          });

          await monitor.start();

          success = true;
          output = {
            status: "monitoring",
            monitorId: nodeId,
            success: true,
            checkInterval: config.interval,
            targets: config.targets,
          };
          message = "✅ Continuous monitoring started";

          console.log("✅ [Monitor] Started successfully");
          logger.toolCompleted("Monitor", output, Date.now() - nodeStartTime);

          break;
        }

        case "agent.delegate": {
          console.log("🤖 [AgentDelegate] Delegating to agent");

          const agentId = config.agentId;
          if (!agentId) {
            throw new Error("agent.delegate requires config.agentId");
          }

          logger.toolStarted("Agent Delegate", nodeId, config);

          const payload =
            config.payload && Object.keys(config.payload).length > 0
              ? config.payload
              : context.vars;

          console.log("📦 [AgentDelegate] Payload:");
          console.log(JSON.stringify(payload, null, 2));

          try {
            const result = await callA2AAgent(agentId, payload);

            output = {
              success: true,
              delegatedTo: agentId,
              response: result,
            };

            success = true;
            message = `✅ Delegated to agent ${agentId}`;

            logger.toolCompleted(
              "Agent Delegate",
              output,
              Date.now() - nodeStartTime,
            );
          } catch (err: any) {
            success = false;
            message = `❌ Agent delegate failed: ${err.message}`;
            output = { success: false, error: err.message };

            logger.toolFailed("Agent Delegate", err.message);
            throw err;
          }

          break;
        }

        case "logic.approval": {
          console.log("⏸️ [Approval] Waiting for manual approval");
          logger.approvalRequired(
            nodeId,
            config.message || "Approval required",
          );
          context.status = "paused";

          await Run.findByIdAndUpdate(runId, {
            status: "paused",
            pausedAt: new Date(),
          });

          const decision = await waitForApproval(runId);
          console.log("✅ [Approval] Decision received:", decision);
          logger.approvalReceived(nodeId, decision === "approved");

          if (decision === "rejected") {
            throw new Error("❌ Approval rejected by user");
          }

          context.status = "running";
          message = "✅ Approved. Continuing workflow...";
          output = { approved: true, success: true };
          success = true;
          break;
        }

        default: {
          console.log("⚠️ [Workflow] Node type not implemented:", nodeType);
          logger.warning(nodeId, `Node type '${nodeType}' not implemented`);
          message = `⚠️ Skipped: ${nodeType}`;
          success = true;
          output = { skipped: true, nodeType, success: true };
          break;
        }
      }

      // ====================================
      // SAVE TO CONTEXT
      // ====================================

      console.log("💾 [Workflow] Saving output to context");
      saveToContext({ context, nodeId, nodeType, output });

      const nodeDuration = Date.now() - nodeStartTime;
      console.log(`⏱️ [Workflow] Node completed in ${nodeDuration}ms`);
      logger.nodeCompleted(nodeId, label, output, nodeDuration);

      await Run.findByIdAndUpdate(runId, {
        $push: {
          logs: {
            nodeId,
            label,
            status: success ? "success" : "failed",
            message,
            output,
            timestamp: new Date(),
          },
        },
      });

      if (success) successCount++;

      // ====================================
      // DETERMINE NEXT NODE
      // ====================================

      console.log("🔀 [Workflow] Determining next node");

      let nextNodeId: string | null = null;

      // Use enhanced fallback routing evaluation
      nextNodeId = evaluateEnhancedFallbackRoutes(
        nodeId,
        nodeType,
        output,
        config,
        context,
        logger,
      );

      // If no fallback route determined, use sequential navigation
      if (!nextNodeId) {
        const outs = outgoing.get(nodeId) || [];
        if (outs.length > 0) {
          nextNodeId = outs[0].target;
          console.log(
            "➡️ [Workflow] Using edge-based navigation to:",
            nextNodeId,
          );
        }
      }

      // Navigate to next node
      if (nextNodeId) {
        const targetNode = nodeMap.get(nextNodeId);
        if (!targetNode) {
          console.log("❌ [Workflow] Target node not found:", nextNodeId);
          logger.log("error", `❌ Target node not found: ${nextNodeId}`);
          currentNode = null;
          break;
        }

        console.log(
          "➡️ [Workflow] Navigating to:",
          targetNode.data?.label || nextNodeId,
        );
        logger.log(
          "info",
          `➡️ Navigating to: ${targetNode.data?.label || nextNodeId}`,
        );
        currentNode = targetNode;
      } else {
        // No more nodes - workflow complete
        console.log("✅ [Workflow] No more nodes, workflow complete");
        currentNode = null;
      }
    } catch (error: any) {
      const nodeDuration = Date.now() - nodeStartTime;
      console.log("❌ [Workflow] Node execution error:", error.message);
      logger.error(nodeId, error.message || "Unknown error");
      logger.nodeFailed(nodeId, label, error.message, nodeDuration);

      context.errors.push({
        nodeId,
        message: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      });

      await Run.findByIdAndUpdate(runId, {
        status: "failed",
        $push: {
          logs: {
            nodeId,
            label,
            status: "failed",
            error: error.message,
            timestamp: new Date(),
          },
        },
      });

      logger.workflowFailed(error.message, nodeId);

      console.log("\n");
      console.log("=".repeat(80));
      console.log("❌ WORKFLOW EXECUTION FAILED");
      console.log("=".repeat(80));
      console.log("Error:", error.message);
      console.log("Failed Node:", nodeId);
      console.log("=".repeat(80));
      console.log("\n");

      return;
    }
  }

  const workflowDuration = Date.now() - workflowStartTime;
  context.status = "success";
  context.completedAt = new Date().toISOString();
  context.duration = workflowDuration;

  await Run.findByIdAndUpdate(runId, {
    status: "success",
    completedAt: new Date(),
  });

  logger.workflowCompleted(workflowDuration, successCount, nodes.length);

  console.log("\n");
  console.log("=".repeat(80));
  console.log("✅ WORKFLOW EXECUTION COMPLETED");
  console.log("=".repeat(80));
  console.log("⏱️  Total Duration:", workflowDuration, "ms");
  console.log("✅ Successful Nodes:", successCount, "/", nodes.length);
  console.log("=".repeat(80));
  console.log("\n");
}
