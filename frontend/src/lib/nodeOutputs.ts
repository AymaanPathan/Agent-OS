/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ====================================
 * 📊 NODE OUTPUT SCHEMA
 * ====================================
 * Defines the output structure for each node type
 * Used for template variable insertion and fallback routing
 */

export type NodeOutput = {
  path: string; // The field path (e.g., "success", "statusCode")
  label: string; // Human-readable label
  type: "boolean" | "string" | "number" | "array" | "object";
  description?: string; // Helper text
  example?: any; // Example value
};

export const nodeOutputSchema: Record<string, NodeOutput[]> = {
  // ====================================
  // HTTP HEALTH CHECK
  // ====================================
  "tool.httpHealth": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether the health check passed",
      example: true,
    },
    {
      path: "pass",
      label: "Pass",
      type: "boolean",
      description: "Alternative success field (backward compatible)",
      example: true,
    },
    {
      path: "statusCode",
      label: "Status Code",
      type: "number",
      description: "HTTP status code returned",
      example: 200,
    },
    {
      path: "latency",
      label: "Latency (ms)",
      type: "number",
      description: "Response time in milliseconds",
      example: 150,
    },
    {
      path: "responseTime",
      label: "Response Time",
      type: "string",
      description: "Formatted response time",
      example: "150ms",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error message if check failed",
      example: "Connection timeout",
    },
    {
      path: "attempts",
      label: "Attempts",
      type: "number",
      description: "Number of retry attempts made",
      example: 1,
    },
  ],

  // ====================================
  // DOCKER STATUS
  // ====================================
  "tool.dockerStatus": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether status check succeeded",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of the container",
      example: "my-app",
    },
    {
      path: "status",
      label: "Status",
      type: "string",
      description: "Container status (running, exited, etc.)",
      example: "running",
    },
    {
      path: "health",
      label: "Health Status",
      type: "string",
      description: "Container health (healthy, unhealthy)",
      example: "healthy",
    },
    {
      path: "uptime",
      label: "Uptime",
      type: "string",
      description: "How long container has been running",
      example: "2 hours",
    },
    {
      path: "image",
      label: "Image",
      type: "string",
      description: "Container image name",
      example: "nginx:latest",
    },
  ],

  // ====================================
  // DOCKER LOGS
  // ====================================
  "tool.dockerLogs": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether logs were retrieved",
      example: true,
    },
    {
      path: "logs",
      label: "Log Content",
      type: "string",
      description: "Container log output",
      example: "Server started on port 3000",
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of the container",
      example: "my-app",
    },
    {
      path: "lineCount",
      label: "Line Count",
      type: "number",
      description: "Number of log lines retrieved",
      example: 100,
    },
  ],

  // ====================================
  // DOCKER RESTART
  // ====================================
  "tool.dockerRestart": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether restart succeeded",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of restarted container",
      example: "my-app",
    },
    {
      path: "action",
      label: "Action",
      type: "string",
      description: "Action performed",
      example: "restart",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if restart failed",
      example: "Container not found",
    },
  ],

  // ====================================
  // DOCKER ROLLBACK
  // ====================================
  "tool.dockerRollback": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether rollback succeeded",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of rolled back container",
      example: "my-app",
    },
    {
      path: "previousImage",
      label: "Previous Image",
      type: "string",
      description: "Image that was rolled back from",
      example: "my-app:v2.0",
    },
    {
      path: "currentImage",
      label: "Current Image",
      type: "string",
      description: "Image rolled back to",
      example: "my-app:v1.0",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if rollback failed",
      example: "Image not found",
    },
  ],

  // ====================================
  // DOCKER LIST ALL
  // ====================================
  "tool.dockerListAll": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether listing succeeded",
      example: true,
    },
    {
      path: "totalCount",
      label: "Total Containers",
      type: "number",
      description: "Total number of containers",
      example: 5,
    },
    {
      path: "healthyCount",
      label: "Healthy Count",
      type: "number",
      description: "Number of healthy containers",
      example: 4,
    },
    {
      path: "unhealthyCount",
      label: "Unhealthy Count",
      type: "number",
      description: "Number of unhealthy containers",
      example: 1,
    },
    {
      path: "unhealthyContainers",
      label: "Unhealthy Containers",
      type: "array",
      description: "List of unhealthy container names",
      example: ["app-1", "app-2"],
    },
    {
      path: "containers",
      label: "Container List",
      type: "array",
      description: "Full container details",
      example: [],
    },
  ],

  // ====================================
  // DOCKER BULK RESTART
  // ====================================
  "tool.dockerBulkRestart": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether all restarts succeeded",
      example: true,
    },
    {
      path: "totalCount",
      label: "Total Containers",
      type: "number",
      description: "Number of containers attempted",
      example: 3,
    },
    {
      path: "successCount",
      label: "Success Count",
      type: "number",
      description: "Number of successful restarts",
      example: 2,
    },
    {
      path: "failedCount",
      label: "Failed Count",
      type: "number",
      description: "Number of failed restarts",
      example: 1,
    },
    {
      path: "results",
      label: "Detailed Results",
      type: "array",
      description: "Per-container restart results",
      example: [],
    },
  ],

  // ====================================
  // DOCKER BULK LOGS
  // ====================================
  "tool.dockerBulkLogs": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether all logs were retrieved",
      example: true,
    },
    {
      path: "logs",
      label: "Combined Logs",
      type: "object",
      description: "Container name to logs mapping",
      example: { "app-1": "logs...", "app-2": "logs..." },
    },
    {
      path: "failedContainers",
      label: "Failed Containers",
      type: "array",
      description: "Containers that failed to return logs",
      example: ["app-3"],
    },
  ],

  // ====================================
  // HEALTH CHECK SCANNER
  // ====================================
  "tool.healthCheckScanner": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether scan completed",
      example: true,
    },
    {
      path: "scannedCount",
      label: "Scanned Count",
      type: "number",
      description: "Number of containers scanned",
      example: 5,
    },
    {
      path: "healthyCount",
      label: "Healthy Count",
      type: "number",
      description: "Number of healthy containers",
      example: 4,
    },
    {
      path: "unhealthyCount",
      label: "Unhealthy Count",
      type: "number",
      description: "Number of unhealthy containers",
      example: 1,
    },
    {
      path: "unhealthyContainers",
      label: "Unhealthy Containers",
      type: "array",
      description: "List of unhealthy container names",
      example: ["api-service"],
    },
    {
      path: "reports",
      label: "Health Reports",
      type: "array",
      description: "Detailed health reports per container",
      example: [],
    },
  ],

  // ====================================
  // AI LOG ANALYZER
  // ====================================
  "agent.aiAnalyzer": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether analysis completed",
      example: true,
    },
    {
      path: "summary",
      label: "Summary",
      type: "string",
      description: "One-line issue summary",
      example: "Database connection pool exhausted",
    },
    {
      path: "rootCause",
      label: "Root Cause",
      type: "string",
      description: "Detailed root cause explanation",
      example: "Connection pool reached max size...",
    },
    {
      path: "errorCategory",
      label: "Error Category",
      type: "string",
      description: "Category of error detected",
      example: "database_error",
    },
    {
      path: "confidence",
      label: "Confidence",
      type: "string",
      description: "AI confidence level (high, medium, low)",
      example: "high",
    },
    {
      path: "affectedServices",
      label: "Affected Services",
      type: "array",
      description: "List of affected services",
      example: ["api-service", "worker"],
    },
    {
      path: "suggestedFixes",
      label: "Suggested Fixes",
      type: "array",
      description: "Recommended remediation steps",
      example: ["Increase connection pool size", "Restart database"],
    },
    {
      path: "keyLogLines",
      label: "Key Log Lines",
      type: "array",
      description: "Most important log excerpts",
      example: ["ERROR: Connection timeout", "FATAL: Pool exhausted"],
    },
  ],

  // ====================================
  // SLACK NOTIFY
  // ====================================
  "tool.slackNotify": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether notification was sent",
      example: true,
    },
    {
      path: "channel",
      label: "Channel",
      type: "string",
      description: "Channel where message was sent",
      example: "#alerts",
    },
    {
      path: "message",
      label: "Message",
      type: "string",
      description: "Message content sent",
      example: "Container restarted successfully",
    },
    {
      path: "timestamp",
      label: "Timestamp",
      type: "string",
      description: "When notification was sent",
      example: "2024-01-15T10:30:00Z",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if sending failed",
      example: "Invalid webhook URL",
    },
  ],

  // ====================================
  // APPROVAL GATE
  // ====================================
  "logic.approval": [
    {
      path: "approved",
      label: "Approved",
      type: "boolean",
      description: "Whether approval was granted",
      example: true,
    },
    {
      path: "approver",
      label: "Approver",
      type: "string",
      description: "Who approved/denied",
      example: "admin@example.com",
    },
    {
      path: "timestamp",
      label: "Timestamp",
      type: "string",
      description: "When decision was made",
      example: "2024-01-15T10:30:00Z",
    },
    {
      path: "comment",
      label: "Comment",
      type: "string",
      description: "Optional comment from approver",
      example: "Approved for emergency fix",
    },
  ],

  // ====================================
  // DOCKER STOP
  // ====================================
  "tool.dockerStop": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether container was stopped",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of stopped container",
      example: "my-app",
    },
    {
      path: "action",
      label: "Action",
      type: "string",
      description: "Action performed",
      example: "stop",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if stop failed",
      example: "Container not running",
    },
  ],

  // ====================================
  // DOCKER START
  // ====================================
  "tool.dockerStart": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether container was started",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of started container",
      example: "my-app",
    },
    {
      path: "action",
      label: "Action",
      type: "string",
      description: "Action performed",
      example: "start",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if start failed",
      example: "Port already in use",
    },
  ],

  // ====================================
  // DOCKER REMOVE
  // ====================================
  "tool.dockerRemove": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether container was removed",
      example: true,
    },
    {
      path: "containerName",
      label: "Container Name",
      type: "string",
      description: "Name of removed container",
      example: "my-app",
    },
    {
      path: "action",
      label: "Action",
      type: "string",
      description: "Action performed",
      example: "remove",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if removal failed",
      example: "Container still running",
    },
  ],

  // ====================================
  // DOCKER PRUNE SYSTEM
  // ====================================
  "tool.dockerPruneSystem": [
    {
      path: "success",
      label: "Success",
      type: "boolean",
      description: "Whether prune completed",
      example: true,
    },
    {
      path: "action",
      label: "Action",
      type: "string",
      description: "Action performed",
      example: "prune_system",
    },
    {
      path: "output",
      label: "Output",
      type: "string",
      description: "Docker prune output",
      example: "Deleted Images: 3...",
    },
    {
      path: "error",
      label: "Error Message",
      type: "string",
      description: "Error if prune failed",
      example: "Permission denied",
    },
  ],

  // ====================================
  // CONTINUOUS MONITOR
  // ====================================
  "monitor.continuous": [
    {
      path: "isRunning",
      label: "Is Running",
      type: "boolean",
      description: "Whether monitor is active",
      example: true,
    },
    {
      path: "checkCount",
      label: "Check Count",
      type: "number",
      description: "Number of checks performed",
      example: 10,
    },
    {
      path: "lastCheck",
      label: "Last Check",
      type: "string",
      description: "Timestamp of last check",
      example: "2024-01-15T10:30:00Z",
    },
    {
      path: "alerts",
      label: "Alerts",
      type: "array",
      description: "Recent alerts triggered",
      example: [],
    },
  ],
};

// ====================================
// HELPER: GET NODE OUTPUTS
// ====================================

export function getNodeOutputs(nodeType: string): NodeOutput[] {
  return nodeOutputSchema[nodeType] || [];
}

// ====================================
// HELPER: CHECK IF OUTPUT EXISTS
// ====================================

export function hasOutput(nodeType: string, outputPath: string): boolean {
  const outputs = getNodeOutputs(nodeType);
  return outputs.some((o) => o.path === outputPath);
}

// ====================================
// HELPER: GET OUTPUT METADATA
// ====================================

export function getOutputMetadata(
  nodeType: string,
  outputPath: string,
): NodeOutput | null {
  const outputs = getNodeOutputs(nodeType);
  return outputs.find((o) => o.path === outputPath) || null;
}
