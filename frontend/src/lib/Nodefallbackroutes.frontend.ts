/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ====================================
 * 🎨 FRONTEND - FALLBACK ROUTING UI
 * ====================================
 * This file belongs in: frontend/lib/Nodefallbackroutes.ts
 *
 * Purpose: Provide route metadata for UI configuration
 * Used by: StepConfigPanel, WorkflowBuilder, Route Selector
 * ====================================
 */

export type FallbackRoute = {
  id: string;
  label: string;
  description: string;
  icon: string;
  severity: "success" | "warning" | "error" | "info";
  condition: {
    field: string; // Output field to check
    operator:
      | "equals"
      | "notEquals"
      | "greaterThan"
      | "lessThan"
      | "greaterOrEqual"
      | "lessOrEqual"
      | "contains"
      | "exists";
    value: any; // Expected value
  };
  targetStepId?: string; // Populated by user in UI
};

// ====================================
// HELPER: CHECK IF NODE SUPPORTS FALLBACK ROUTING
// ====================================

export function supportsFallbackRouting(nodeType: string): boolean {
  return fallbackRoutesRegistry[nodeType] !== undefined;
}

// ====================================
// HELPER: GET AVAILABLE ROUTES FOR A NODE
// ====================================

export function getFallbackRoutes(nodeType: string): FallbackRoute[] {
  return fallbackRoutesRegistry[nodeType] || [];
}

// ====================================
// HELPER: GET ROUTE SUMMARY (FOR UI BADGES)
// ====================================

export function getRouteSummary(nodeType: string): {
  totalRoutes: number;
  categories: Record<string, number>;
  supportsRouting: boolean;
} {
  const routes = getFallbackRoutes(nodeType);

  const categories = routes.reduce(
    (acc, route) => {
      acc[route.severity] = (acc[route.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalRoutes: routes.length,
    categories,
    supportsRouting: routes.length > 0,
  };
}

// ====================================
// FALLBACK ROUTES REGISTRY (UI METADATA)
// ====================================

const fallbackRoutesRegistry: Record<string, FallbackRoute[]> = {
  // ====================================
  // HTTP HEALTH CHECK
  // ====================================
  "tool.httpHealth": [
    {
      id: "http-success",
      label: "Health Check Passed",
      description: "Endpoint returned expected status code",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "http-failed",
      label: "Health Check Failed",
      description: "Endpoint returned unexpected status or timed out",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
    {
      id: "http-slow",
      label: "Slow Response",
      description: "Response time exceeded 2 seconds",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "latency",
        operator: "greaterThan",
        value: 2000,
      },
    },
  ],

  // ====================================
  // DOCKER STATUS
  // ====================================
  "tool.dockerStatus": [
    {
      id: "docker-running",
      label: "Container Running",
      description: "Container is healthy and running",
      icon: "✅",
      severity: "success",
      condition: {
        field: "status",
        operator: "equals",
        value: "running",
      },
    },
    {
      id: "docker-stopped",
      label: "Container Stopped",
      description: "Container is not running",
      icon: "⏸️",
      severity: "error",
      condition: {
        field: "status",
        operator: "equals",
        value: "exited",
      },
    },
    {
      id: "docker-unhealthy",
      label: "Container Unhealthy",
      description: "Container running but failing health checks",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "health",
        operator: "equals",
        value: "unhealthy",
      },
    },
  ],

  // ====================================
  // DOCKER RESTART
  // ====================================
  "tool.dockerRestart": [
    {
      id: "restart-success",
      label: "Restart Successful",
      description: "Container restarted successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "restart-failed",
      label: "Restart Failed",
      description: "Failed to restart container",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER ROLLBACK
  // ====================================
  "tool.dockerRollback": [
    {
      id: "rollback-success",
      label: "Rollback Successful",
      description: "Successfully rolled back to previous image",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "rollback-failed",
      label: "Rollback Failed",
      description: "Failed to rollback container",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER LIST ALL
  // ====================================
  "tool.dockerListAll": [
    {
      id: "all-healthy",
      label: "All Containers Healthy",
      description: "No unhealthy containers detected",
      icon: "✅",
      severity: "success",
      condition: {
        field: "unhealthyCount",
        operator: "equals",
        value: 0,
      },
    },
    {
      id: "has-unhealthy",
      label: "Unhealthy Containers Found",
      description: "One or more containers are unhealthy",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "unhealthyCount",
        operator: "greaterThan",
        value: 0,
      },
    },
    {
      id: "critical-failures",
      label: "Critical Failures",
      description: "Multiple containers are unhealthy (>= 3)",
      icon: "🚨",
      severity: "error",
      condition: {
        field: "unhealthyCount",
        operator: "greaterOrEqual",
        value: 3,
      },
    },
  ],

  // ====================================
  // DOCKER BULK RESTART
  // ====================================
  "tool.dockerBulkRestart": [
    {
      id: "bulk-all-success",
      label: "All Restarts Successful",
      description: "All containers restarted successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "failedCount",
        operator: "equals",
        value: 0,
      },
    },
    {
      id: "bulk-partial-success",
      label: "Partial Success",
      description: "Some containers failed to restart",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "failedCount",
        operator: "greaterThan",
        value: 0,
      },
    },
    {
      id: "bulk-all-failed",
      label: "All Restarts Failed",
      description: "None of the containers could be restarted",
      icon: "❌",
      severity: "error",
      condition: {
        field: "successCount",
        operator: "equals",
        value: 0,
      },
    },
  ],

  // ====================================
  // HEALTH CHECK SCANNER
  // ====================================
  "tool.healthCheckScanner": [
    {
      id: "scanner-all-healthy",
      label: "All Services Healthy",
      description: "All scanned containers passed health checks",
      icon: "✅",
      severity: "success",
      condition: {
        field: "unhealthyCount",
        operator: "equals",
        value: 0,
      },
    },
    {
      id: "scanner-minor-issues",
      label: "Minor Health Issues",
      description: "1-2 containers have health issues",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "unhealthyCount",
        operator: "lessThan",
        value: 3,
      },
    },
    {
      id: "scanner-critical",
      label: "Critical Health Issues",
      description: "Multiple containers failing health checks",
      icon: "🚨",
      severity: "error",
      condition: {
        field: "unhealthyCount",
        operator: "greaterOrEqual",
        value: 3,
      },
    },
  ],

  // ====================================
  // AI LOG ANALYZER
  // ====================================
  "agent.aiAnalyzer": [
    {
      id: "ai-high-confidence",
      label: "High Confidence Analysis",
      description: "AI has high confidence in diagnosis (>= 0.8)",
      icon: "🎯",
      severity: "success",
      condition: {
        field: "confidence",
        operator: "equals",
        value: "high",
      },
    },
    {
      id: "ai-medium-confidence",
      label: "Medium Confidence",
      description: "AI has moderate confidence, manual review suggested",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "confidence",
        operator: "equals",
        value: "medium",
      },
    },
    {
      id: "ai-low-confidence",
      label: "Low Confidence",
      description: "AI cannot determine root cause, manual intervention needed",
      icon: "❓",
      severity: "error",
      condition: {
        field: "confidence",
        operator: "equals",
        value: "low",
      },
    },
    {
      id: "ai-critical-error",
      label: "Critical Error Detected",
      description: "AI detected a critical error category",
      icon: "🚨",
      severity: "error",
      condition: {
        field: "errorCategory",
        operator: "equals",
        value: "crash",
      },
    },
  ],

  // ====================================
  // SLACK NOTIFY
  // ====================================
  "tool.slackNotify": [
    {
      id: "slack-sent",
      label: "Notification Sent",
      description: "Slack notification sent successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "slack-failed",
      label: "Notification Failed",
      description: "Failed to send Slack notification",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // APPROVAL GATE
  // ====================================
  "logic.approval": [
    {
      id: "approval-granted",
      label: "Approval Granted",
      description: "Manual approval was granted",
      icon: "✅",
      severity: "success",
      condition: {
        field: "approved",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "approval-denied",
      label: "Approval Denied",
      description: "Manual approval was denied",
      icon: "❌",
      severity: "error",
      condition: {
        field: "approved",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER LOGS
  // ====================================
  "tool.dockerLogs": [
    {
      id: "logs-fetched",
      label: "Logs Retrieved",
      description: "Successfully fetched container logs",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "logs-failed",
      label: "Failed to Get Logs",
      description: "Could not retrieve container logs",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
    {
      id: "logs-has-errors",
      label: "Errors Detected in Logs",
      description: "Log content contains error patterns",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "logs",
        operator: "contains",
        value: "error",
      },
    },
  ],

  // ====================================
  // DOCKER BULK LOGS
  // ====================================
  "tool.dockerBulkLogs": [
    {
      id: "bulk-logs-success",
      label: "All Logs Retrieved",
      description: "Successfully fetched logs from all containers",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "bulk-logs-partial",
      label: "Partial Log Retrieval",
      description: "Some containers logs could not be fetched",
      icon: "⚠️",
      severity: "warning",
      condition: {
        field: "failedContainers",
        operator: "exists",
        value: true,
      },
    },
  ],

  // ====================================
  // DOCKER STOP
  // ====================================
  "tool.dockerStop": [
    {
      id: "stop-success",
      label: "Container Stopped",
      description: "Container stopped successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "stop-failed",
      label: "Stop Failed",
      description: "Failed to stop container",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER START
  // ====================================
  "tool.dockerStart": [
    {
      id: "start-success",
      label: "Container Started",
      description: "Container started successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "start-failed",
      label: "Start Failed",
      description: "Failed to start container",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER REMOVE
  // ====================================
  "tool.dockerRemove": [
    {
      id: "remove-success",
      label: "Container Removed",
      description: "Container removed successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "remove-failed",
      label: "Remove Failed",
      description: "Failed to remove container",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // DOCKER PRUNE SYSTEM
  // ====================================
  "tool.dockerPruneSystem": [
    {
      id: "prune-success",
      label: "Cleanup Successful",
      description: "System resources cleaned up successfully",
      icon: "✅",
      severity: "success",
      condition: {
        field: "success",
        operator: "equals",
        value: true,
      },
    },
    {
      id: "prune-failed",
      label: "Cleanup Failed",
      description: "Failed to clean up system resources",
      icon: "❌",
      severity: "error",
      condition: {
        field: "success",
        operator: "equals",
        value: false,
      },
    },
  ],

  // ====================================
  // CONTINUOUS MONITOR
  // ====================================
  "monitor.continuous": [
    {
      id: "monitor-all-healthy",
      label: "All Targets Healthy",
      description: "No issues detected in monitored targets",
      icon: "✅",
      severity: "success",
      condition: {
        field: "checkCount",
        operator: "greaterThan",
        value: 0,
      },
    },
    {
      id: "monitor-alert-triggered",
      label: "Alert Triggered",
      description: "Monitor detected an issue requiring attention",
      icon: "🚨",
      severity: "warning",
      condition: {
        field: "alerts",
        operator: "exists",
        value: true,
      },
    },
  ],
};
