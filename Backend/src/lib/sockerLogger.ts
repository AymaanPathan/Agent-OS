import { io } from "../index";

export class SocketLogger {
  private runId: string;

  constructor(runId: string) {
    this.runId = runId;
  }

  private emit(event: string, data: any) {
    io.to(this.runId).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  workflowStarted(totalNodes: number, workflowName?: string) {
    this.emit("workflow_started", {
      runId: this.runId,
      totalNodes,
      workflowName,
    });
  }

  nodeStarted(
    nodeId: string,
    nodeType: string,
    label: string,
    stepIndex: number,
    totalSteps: number,
  ) {
    this.emit("node_started", {
      runId: this.runId,
      nodeId,
      nodeType,
      label,
      stepIndex,
      totalSteps,
    });
  }

  nodeCompleted(nodeId: string, label: string, output: any, duration: number) {
    this.emit("node_completed", {
      runId: this.runId,
      nodeId,
      label,
      output,
      duration,
    });
  }

  nodeFailed(nodeId: string, label: string, error: string, duration: number) {
    this.emit("node_failed", {
      runId: this.runId,
      nodeId,
      label,
      message: error,
      duration,
    });
  }

  approvalRequired(nodeId: string, message: string) {
    this.emit("approval_required", {
      runId: this.runId,
      nodeId,
      message,
    });
  }

  approvalReceived(nodeId: string, approved: boolean) {
    this.emit("approval_received", {
      runId: this.runId,
      nodeId,
      approved,
    });
  }

  workflowCompleted(
    duration: number,
    successCount: number,
    totalNodes: number,
  ) {
    this.emit("workflow_completed", {
      runId: this.runId,
      duration,
      successCount,
      totalNodes,
    });
  }

  workflowFailed(error: string, failedNodeId?: string) {
    this.emit("workflow_failed", {
      runId: this.runId,
      error,
      failedNodeId,
    });
  }

  log(level: string, message: string, data?: any) {
    this.emit("log", {
      level,
      message,
      data,
    });
  }

  configResolving(nodeId: string, rawConfig: any) {
    this.log("debug", `🔍 Resolving configuration for ${nodeId}`, {
      rawConfig: this.sanitizeConfig(rawConfig),
    });
  }

  configResolved(nodeId: string, resolvedConfig: any, templateVars: string[]) {
    this.log("debug", `✅ Configuration resolved for ${nodeId}`, {
      resolvedConfig: this.sanitizeConfig(resolvedConfig),
      templateVars,
    });
  }

  toolStarted(toolName: string, nodeId: string, config: any) {
    this.log("info", `🔧 Starting tool: ${toolName}`, {
      nodeId,
      config: this.sanitizeConfig(config),
    });
  }

  toolCompleted(toolName: string, output: any, duration: number) {
    this.log("success", `✅ Tool completed: ${toolName}`, {
      output: this.sanitizeOutput(output),
      duration,
    });
  }

  toolFailed(toolName: string, error: string) {
    this.log("error", `❌ Tool failed: ${toolName}`, { error });
  }

  // 🆕 AI Analyzer specific logging
  aiAnalysisStarted(nodeId: string, containerCount: number) {
    this.log("info", `🧠 Starting AI log analysis`, {
      nodeId,
      containerCount,
    });
  }

  aiAnalysisProgress(nodeId: string, stage: string, details?: any) {
    this.log("info", `🧠 AI Analysis: ${stage}`, {
      nodeId,
      ...details,
    });
  }

  aiAnalysisCompleted(
    nodeId: string,
    result: {
      summary: string;
      confidence: string;
      affectedServices: string[];
    },
  ) {
    this.log("success", `🧠 AI Analysis Complete`, {
      nodeId,
      summary: result.summary,
      confidence: result.confidence,
      affectedServices: result.affectedServices,
    });
  }

  aiAnalysisFailed(nodeId: string, error: string, reason: string) {
    this.log("error", `🧠 AI Analysis Failed`, {
      nodeId,
      error,
      reason,
    });
  }

  // 🆕 Container-specific logging
  containerLogsFetched(containerNames: string[], totalSize: number) {
    this.log("info", `📦 Container logs fetched`, {
      containers: containerNames,
      totalSizeBytes: totalSize,
      containerCount: containerNames.length,
    });
  }

  containerHealthChecked(results: {
    healthy: number;
    unhealthy: number;
    total: number;
  }) {
    this.log("info", `🏥 Container health check completed`, results);
  }

  debug(nodeId: string, message: string, data?: any) {
    this.log("debug", `[${nodeId}] ${message}`, data);
  }

  warning(nodeId: string, message: string, data?: any) {
    this.log("warning", `⚠️ [${nodeId}] ${message}`, data);
  }

  error(nodeId: string, message: string, data?: any) {
    this.log("error", `❌ [${nodeId}] ${message}`, data);
  }

  success(nodeId: string, message: string, data?: any) {
    this.log("success", `✅ [${nodeId}] ${message}`, data);
  }

  /**
   * Sanitize config to avoid sending huge logs to frontend
   */
  private sanitizeConfig(config: any): any {
    if (!config) return config;

    const sanitized = { ...config };

    // Truncate large log strings
    if (sanitized.logs) {
      if (typeof sanitized.logs === "string") {
        sanitized.logs =
          sanitized.logs.length > 500
            ? `${sanitized.logs.substring(0, 500)}... (truncated)`
            : sanitized.logs;
      } else if (typeof sanitized.logs === "object") {
        sanitized.logs = Object.keys(sanitized.logs).reduce(
          (acc, key) => {
            const value = sanitized.logs[key];
            acc[key] =
              typeof value === "string" && value.length > 500
                ? `${value.substring(0, 500)}... (truncated)`
                : value;
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    return sanitized;
  }

  /**
   * Sanitize output to avoid sending huge data
   */
  private sanitizeOutput(output: any): any {
    if (!output) return output;

    const sanitized = { ...output };

    // Truncate large arrays
    if (
      Array.isArray(sanitized.keyLogLines) &&
      sanitized.keyLogLines.length > 5
    ) {
      sanitized.keyLogLines = [
        ...sanitized.keyLogLines.slice(0, 5),
        `... and ${sanitized.keyLogLines.length - 5} more`,
      ];
    }

    // Truncate large strings in container analysis
    if (sanitized.containerAnalysis) {
      sanitized.containerAnalysis = sanitized.containerAnalysis.map(
        (c: any) => ({
          ...c,
          issues:
            c.issues && c.issues.length > 3
              ? [...c.issues.slice(0, 3), `... and ${c.issues.length - 3} more`]
              : c.issues,
        }),
      );
    }

    return sanitized;
  }
}

// Helper function to extract template variables from config
export function extractTemplateVariables(config: any): string[] {
  const variables: string[] = [];
  const regex = /\{\{(.*?)\}\}/g;

  const extract = (obj: any) => {
    if (typeof obj === "string") {
      const matches = obj.matchAll(regex);
      for (const match of matches) {
        variables.push(match[1].trim());
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(extract);
    } else if (typeof obj === "object" && obj !== null) {
      Object.values(obj).forEach(extract);
    }
  };

  extract(config);
  return [...new Set(variables)]; // Remove duplicates
}
