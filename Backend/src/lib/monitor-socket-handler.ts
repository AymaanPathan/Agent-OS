import { Server, Socket } from "socket.io";
import { activeMonitors } from "../routes/MonitorApi.routes";

/**
 * Setup Socket.IO handlers for monitor functionality with enhanced AI features
 */
export function setupMonitorSocketHandlers(io: Server) {
  console.log("🔌 [Monitor Socket] Setting up monitor socket handlers");

  io.on("connection", (socket: Socket) => {
    // Handle join-monitor event
    socket.on("join-monitor", (sessionId: string) => {
      console.log(
        `📥 [Monitor Socket] Client ${socket.id} joining monitor session: ${sessionId}`,
      );

      socket.join(sessionId);

      // Send confirmation
      socket.emit("monitor-joined", {
        sessionId,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ [Monitor Socket] Client joined session: ${sessionId}`);
    });

    // Handle leave-monitor event
    socket.on("leave-monitor", (sessionId: string) => {
      console.log(
        `📤 [Monitor Socket] Client ${socket.id} leaving session: ${sessionId}`,
      );
      socket.leave(sessionId);
    });

    // Handle AI fix container request with enhanced workflow
    socket.on(
      "ai-fix-container",
      async (data: { sessionId: string; containerName: string }) => {
        console.log(
          `🤖 [Monitor Socket] AI fix requested for container: ${data.containerName}`,
        );

        try {
          // Get the monitor instance
          const monitor = activeMonitors.get(data.sessionId);

          if (!monitor) {
            socket.emit("ai-fix-error", {
              success: false,
              message: "Monitor session not found",
              containerName: data.containerName,
            });
            return;
          }

          // Emit progress: analyzing
          socket.emit("ai-fix-progress", {
            stage: "analyzing",
            containerName: data.containerName,
            message: "Fetching container logs and analyzing...",
          });

          // Import necessary tools
          const { runAILogAnalysis } =
            await import("../engine/tools/aiAnalyzer.tool");
          const { runDockerLogs, runDockerRestart } =
            await import("../engine/tools/docker.tool");

          // Step 1: Get container logs
          const logsResult = await runDockerLogs({
            containerName: data.containerName,
            tail: 200,
          });

          if (!logsResult.success) {
            throw new Error("Failed to fetch container logs");
          }

          // Step 2: Run AI analysis
          socket.emit("ai-fix-progress", {
            stage: "analyzing",
            containerName: data.containerName,
            message: "Running AI analysis on logs...",
          });

          const analysis = await runAILogAnalysis({
            logs: logsResult.logs,
            containerNames: [data.containerName],
            context: "Container health recovery analysis",
          });

          // Step 3: Generate AI suggestions based on analysis
          const suggestions = generateAISuggestions(analysis);

          // Step 4: Send analysis and suggestions to frontend
          socket.emit("ai-analysis-complete", {
            containerName: data.containerName,
            analysis: {
              summary: analysis.summary,
              rootCause: analysis.rootCause,
              confidence: analysis.confidence,
              errorCategory: analysis.errorCategory,
              keyLogLines: analysis.keyLogLines,
            },
            suggestions,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `✅ [Monitor Socket] AI analysis completed for: ${data.containerName}`,
          );
        } catch (error: any) {
          console.error(`❌ [Monitor Socket] AI fix error:`, error);

          socket.emit("ai-fix-error", {
            success: false,
            containerName: data.containerName,
            message: `Analysis failed: ${error.message}`,
          });
        }
      },
    );

    // Handle user action selection (restart, send to Slack, etc.)
    socket.on(
      "ai-action-selected",
      async (data: {
        sessionId: string;
        containerName: string;
        action: "restart" | "send_to_slack" | "ignore";
        analysis?: any;
      }) => {
        console.log(
          `🎯 [Monitor Socket] Action selected: ${data.action} for ${data.containerName}`,
        );

        try {
          if (data.action === "restart") {
            // Request approval for restart
            socket.emit("approval-required", {
              containerName: data.containerName,
              action: "restart",
              reason: data.analysis?.summary || "Container restart required",
              timestamp: new Date().toISOString(),
            });
          } else if (data.action === "send_to_slack") {
            // Send logs to Slack
            await handleSendToSlack(data, socket);
          } else if (data.action === "ignore") {
            socket.emit("ai-action-result", {
              success: true,
              containerName: data.containerName,
              action: "ignore",
              message: "Action ignored by user",
            });
          }
        } catch (error: any) {
          socket.emit("ai-action-error", {
            success: false,
            containerName: data.containerName,
            message: error.message,
          });
        }
      },
    );

    // Handle approval response
    socket.on(
      "approval-response",
      async (data: {
        sessionId: string;
        containerName: string;
        action: string;
        approved: boolean;
      }) => {
        console.log(
          `${data.approved ? "✅" : "❌"} [Monitor Socket] Approval ${data.approved ? "granted" : "rejected"} for ${data.containerName}`,
        );

        if (data.approved && data.action === "restart") {
          await handleRestartContainer(data, socket);
        } else {
          socket.emit("ai-action-result", {
            success: false,
            containerName: data.containerName,
            action: data.action,
            message: "Action rejected by user",
          });
        }
      },
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔌 [Monitor Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ [Monitor Socket] Monitor socket handlers setup complete");
}

/**
 * Generate AI suggestions based on analysis
 */
function generateAISuggestions(analysis: any): Array<{
  id: string;
  action: "restart" | "send_to_slack" | "rollback" | "scale" | "check_config";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  requiresApproval: boolean;
}> {
  const suggestions = [];

  // Always offer restart for critical issues
  if (
    analysis.errorCategory === "crash" ||
    analysis.errorCategory === "memory_leak" ||
    analysis.errorCategory === "dependency_failure"
  ) {
    suggestions.push({
      id: "restart",
      action: "restart" as const,
      title: "Restart Container",
      description:
        "Restart the container to recover from the current failure state",
      severity: "high" as const,
      requiresApproval: true,
    });
  }

  // Suggest sending to Slack for team awareness
  if (analysis.confidence === "high" || analysis.confidence === "medium") {
    suggestions.push({
      id: "send_to_slack",
      action: "send_to_slack" as const,
      title: "Notify Team via Slack",
      description: "Send detailed analysis and logs to Slack for team review",
      severity: "medium" as const,
      requiresApproval: false,
    });
  }

  // Suggest rollback for configuration errors
  if (analysis.errorCategory === "configuration_error") {
    suggestions.push({
      id: "check_config",
      action: "check_config" as const,
      title: "Review Configuration",
      description:
        "Configuration issue detected. Review and update container configuration",
      severity: "high" as const,
      requiresApproval: false,
    });
  }

  // Suggest scaling for resource exhaustion
  if (analysis.errorCategory === "resource_exhaustion") {
    suggestions.push({
      id: "scale",
      action: "scale" as const,
      title: "Scale Resources",
      description:
        "Container may need more resources. Consider scaling up CPU/memory",
      severity: "medium" as const,
      requiresApproval: true,
    });
  }

  // Add rollback suggestion for high-confidence issues
  if (analysis.confidence === "high") {
    suggestions.push({
      id: "rollback",
      action: "rollback" as const,
      title: "Rollback to Previous Version",
      description:
        "If recent deployment caused the issue, rollback to previous stable version",
      severity: "high" as const,
      requiresApproval: true,
    });
  }

  return suggestions;
}

/**
 * Handle sending logs to Slack
 */
async function handleSendToSlack(data: any, socket: Socket) {
  try {
    socket.emit("ai-action-progress", {
      containerName: data.containerName,
      action: "send_to_slack",
      message: "Sending analysis to Slack...",
    });

    const { runSlackNotify } = await import("../engine/tools/slack.tool");

    // Format the message for Slack
    const slackMessage = formatSlackMessage(data);

    const result = await runSlackNotify({
      webhookUrl: process.env.SLACK_WEBHOOK_URL!,
      message: slackMessage.message,
      severity: "warning",
      includeLogSnippet: true,
      logSnippet: slackMessage.logSnippet,
      metadata: slackMessage.metadata,
    });

    if (result.success) {
      socket.emit("ai-action-result", {
        success: true,
        containerName: data.containerName,
        action: "send_to_slack",
        message: "Analysis sent to Slack successfully",
      });
    } else {
      throw new Error(result.error || "Failed to send to Slack");
    }
  } catch (error: any) {
    console.error("❌ [Slack] Error:", error);
    socket.emit("ai-action-error", {
      success: false,
      containerName: data.containerName,
      message: `Failed to send to Slack: ${error.message}`,
    });
  }
}

/**
 * Format message for Slack
 */
function formatSlackMessage(data: any): {
  message: string;
  logSnippet: string;
  metadata: Record<string, any>;
} {
  const analysis = data.analysis;

  return {
    message: `🚨 *Container Issue Detected: ${data.containerName}*\n\n${analysis.summary}`,
    logSnippet:
      analysis.keyLogLines?.join("\n") || "No key log lines available",
    metadata: {
      "Root Cause": analysis.rootCause || "Unknown",
      Confidence: analysis.confidence || "low",
      Category: analysis.errorCategory || "unknown",
      "Affected Services": analysis.affectedServices?.join(", ") || "None",
      Timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Handle container restart after approval
 */
async function handleRestartContainer(data: any, socket: Socket) {
  try {
    socket.emit("ai-action-progress", {
      containerName: data.containerName,
      action: "restart",
      message: "Restarting container...",
    });

    const { runDockerRestart } = await import("../engine/tools/docker.tool");

    const restartResult = await runDockerRestart({
      containerName: data.containerName,
      timeout: 10,
    });

    if (restartResult.success) {
      // Wait a bit for container to start
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if restart was successful
      socket.emit("ai-action-result", {
        success: true,
        containerName: data.containerName,
        action: "restart",
        message: "Container restarted successfully",
      });

      // Optionally notify Slack about the recovery action
      try {
        const { runSlackNotify } = await import("../engine/tools/slack.tool");
        await runSlackNotify({
          webhookUrl: process.env.SLACK_WEBHOOK_URL!,
          message: `✅ *Container Recovered*\n\nContainer \`${data.containerName}\` was automatically restarted and is now running.`,
          severity: "success",
          metadata: {
            Container: data.containerName,
            Action: "Auto-restart",
            Timestamp: new Date().toISOString(),
          },
        });
      } catch (slackError) {
        console.error("Failed to send Slack notification:", slackError);
      }
    } else {
      throw new Error(restartResult.error || "Restart failed");
    }
  } catch (error: any) {
    console.error("❌ [Restart] Error:", error);
    socket.emit("ai-action-error", {
      success: false,
      containerName: data.containerName,
      message: `Restart failed: ${error.message}`,
    });
  }
}
