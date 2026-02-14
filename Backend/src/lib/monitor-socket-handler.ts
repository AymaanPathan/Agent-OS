import { Server, Socket } from "socket.io";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";
import { runDockerRestart, runDockerLogs } from "../engine/tools/docker.tool";
import {
  runDockerStop,
  runDockerStart,
  runDockerRemove,
  runDockerPruneSystem,
} from "../engine/tools/docker.extra.tool";
import { runAILogAnalysis } from "../engine/tools/aiAnalyzer.tool";
import { runSlackNotify } from "../engine/tools/slack.tool";

// Store pending restart approvals - single response only
const pendingRestartApprovals = new Map<
  string,
  {
    resolve: (approved: boolean) => void;
    reject: (error: Error) => void;
    containerName: string;
    sessionId: string;
    resolved: boolean;
    timestamp: number;
  }
>();

// Cleanup old approvals every minute
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute

  for (const [approvalId, approval] of pendingRestartApprovals.entries()) {
    if (now - approval.timestamp > timeout) {
      if (!approval.resolved) {
        console.log(
          `🧹 [Monitor Socket] Cleaning up stale approval: ${approvalId}`,
        );
        approval.resolved = true;
        approval.resolve(false);
      }
      pendingRestartApprovals.delete(approvalId);
    }
  }
}, 60000);

export function setupMonitorSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 [Monitor Socket] Client connected: ${socket.id}`);

    // Join monitor session
    socket.on("join-monitor", (sessionId: string) => {
      socket.join(sessionId);
      console.log(
        `📥 [Monitor Socket] Client ${socket.id} joined session: ${sessionId}`,
      );

      socket.emit("monitor-joined", {
        sessionId,
        message: "Successfully joined monitor session",
      });
    });

    // Leave monitor session
    socket.on("leave-monitor", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(
        `📤 [Monitor Socket] Client ${socket.id} left session: ${sessionId}`,
      );
    });

    // Handle AI analysis request
    socket.on(
      "ai-analyze-container",
      async (data: { sessionId: string; containerName: string }) => {
        console.log("🧠 [Monitor Socket] AI analysis requested:", data);

        try {
          // Emit analyzing state
          io.to(data.sessionId).emit("ai-analysis-started", {
            containerName: data.containerName,
          });

          console.log(
            `📦 [Monitor Socket] Fetching logs for: ${data.containerName}`,
          );

          // Try MCP first, fallback to direct
          let logsResult;
          try {
            console.log("🔧 [Monitor Socket] Attempting MCP log fetch...");
            logsResult = await executeMCPTool("tool.dockerLogs", {
              containerName: data.containerName,
              tail: 200,
            });
            console.log("✅ [Monitor Socket] MCP logs fetched successfully");
          } catch (mcpError: any) {
            console.warn(
              `⚠️ [Monitor Socket] MCP logs failed: ${mcpError.message}`,
            );
            console.log("🔧 [Monitor Socket] Attempting direct log fetch...");

            // Fallback to direct docker execution
            logsResult = await runDockerLogs({
              containerName: data.containerName,
              tail: 200,
              timestamps: false,
            });
            console.log("✅ [Monitor Socket] Direct logs fetched successfully");
          }

          if (!logsResult.success) {
            throw new Error(
              `Failed to fetch container logs: ${logsResult.error || "Unknown error"}`,
            );
          }

          console.log(
            `🧠 [Monitor Socket] Running AI analysis on logs (${logsResult.logs?.length || 0} chars)...`,
          );

          // Run AI analysis (try MCP first, fallback to direct)
          let analysis;
          try {
            console.log("🔧 [Monitor Socket] Attempting MCP AI analysis...");
            analysis = await executeMCPTool("agent.aiAnalyzer", {
              logs: { [data.containerName]: logsResult.logs },
              containerNames: [data.containerName],
              context: `Analyzing container ${data.containerName} for issues`,
            });
            console.log(
              "✅ [Monitor Socket] MCP AI analysis completed successfully",
            );
          } catch (mcpError: any) {
            console.warn(
              `⚠️ [Monitor Socket] MCP AI analysis failed: ${mcpError.message}`,
            );
            console.log("🔧 [Monitor Socket] Attempting direct AI analysis...");

            // Fallback to direct Groq API call
            analysis = await runAILogAnalysis({
              logs: { [data.containerName]: logsResult.logs },
              containerNames: [data.containerName],
              context: `Analyzing container ${data.containerName} for issues`,
              provider: "groq",
            });
            console.log(
              "✅ [Monitor Socket] Direct AI analysis completed successfully",
            );
          }

          console.log(
            `📊 [Monitor Socket] AI Analysis Results:`,
            JSON.stringify(
              {
                summary: analysis.summary,
                confidence: analysis.confidence,
                errorCategory: analysis.errorCategory,
              },
              null,
              2,
            ),
          );

          // Send analysis results back
          io.to(data.sessionId).emit("ai-analysis-complete", {
            containerName: data.containerName,
            analysis,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] AI analysis error:", error);
          console.error("Stack:", error.stack);

          io.to(data.sessionId).emit("ai-analysis-error", {
            containerName: data.containerName,
            error: error.message,
          });
        }
      },
    );

    // Handle restart approval request
    socket.on(
      "request-restart-approval",
      async (data: {
        sessionId: string;
        containerName: string;
        reason: string;
      }) => {
        console.log("🔐 [Monitor Socket] Restart approval requested:", data);

        const approvalId = `restart-${data.sessionId}-${data.containerName}-${Date.now()}`;

        // Send approval request to all clients in the session
        io.to(data.sessionId).emit("restart-approval-required", {
          approvalId,
          containerName: data.containerName,
          reason: data.reason,
          timestamp: new Date().toISOString(),
        });

        try {
          // Wait for approval with timeout
          const approved = await waitForRestartApproval(
            approvalId,
            data.containerName,
            data.sessionId,
            30000, // 30 second timeout
          );

          console.log(
            `📋 [Monitor Socket] Approval result: ${approved ? "APPROVED" : "REJECTED"}`,
          );

          if (approved) {
            console.log(
              `✅ [Monitor Socket] Starting restart for ${data.containerName}`,
            );

            // Emit restarting state
            io.to(data.sessionId).emit("container-restarting", {
              containerName: data.containerName,
            });

            // Execute restart with comprehensive fallback mechanism
            let result;
            let method = "unknown";

            try {
              // Try MCP first
              console.log(
                `🔧 [Monitor Socket] Attempting restart via MCP for ${data.containerName}...`,
              );
              result = await executeMCPTool("tool.dockerRestart", {
                containerName: data.containerName,
                timeout: 30,
              });
              method = "MCP";
              console.log(
                `✅ [Monitor Socket] MCP restart completed:`,
                JSON.stringify(result, null, 2),
              );
            } catch (mcpError: any) {
              console.warn(
                `⚠️ [Monitor Socket] MCP restart failed: ${mcpError.message}`,
              );
              console.log(
                `🔧 [Monitor Socket] Attempting direct docker restart for ${data.containerName}...`,
              );

              // Fallback to direct docker execution
              try {
                result = await runDockerRestart({
                  containerName: data.containerName,
                  timeout: 30,
                });
                method = "Direct Docker";
                console.log(
                  `✅ [Monitor Socket] Direct restart completed:`,
                  JSON.stringify(result, null, 2),
                );
              } catch (directError: any) {
                console.error(
                  `❌ [Monitor Socket] Direct restart also failed: ${directError.message}`,
                );
                console.error("Stack:", directError.stack);

                throw new Error(
                  `Both MCP and direct restart failed. MCP Error: ${mcpError.message}, Direct Error: ${directError.message}`,
                );
              }
            }

            console.log(
              `📊 [Monitor Socket] Final restart result (via ${method}):`,
              JSON.stringify(
                {
                  success: result.success,
                  containerName: result.containerName || data.containerName,
                  method,
                },
                null,
                2,
              ),
            );

            io.to(data.sessionId).emit("restart-completed", {
              containerName: data.containerName,
              success: result.success,
              method,
              message: result.success
                ? `✅ Container ${data.containerName} restarted successfully (via ${method})`
                : `❌ Failed to restart ${data.containerName}: ${result.error || "Unknown error"}`,
            });
          } else {
            console.log(
              `❌ [Monitor Socket] Restart rejected for ${data.containerName}`,
            );

            io.to(data.sessionId).emit("restart-rejected", {
              containerName: data.containerName,
              message: `Restart request for ${data.containerName} was rejected by user`,
            });
          }
        } catch (error: any) {
          console.error("❌ [Monitor Socket] Restart flow error:", error);
          console.error("Stack:", error.stack);

          io.to(data.sessionId).emit("restart-error", {
            containerName: data.containerName,
            message: `Error during restart: ${error.message}`,
          });
        }
      },
    );

    // Handle restart approval response - SINGLE RESPONSE ONLY
    socket.on(
      "restart-approval-response",
      (data: { approvalId: string; approved: boolean }) => {
        console.log("📨 [Monitor Socket] Approval response:", data);

        const pending = pendingRestartApprovals.get(data.approvalId);

        if (pending && !pending.resolved) {
          // Mark as resolved to prevent duplicate responses
          pending.resolved = true;
          pending.resolve(data.approved);
          pendingRestartApprovals.delete(data.approvalId);

          console.log(
            `✅ [Monitor Socket] Approval processed: ${data.approved ? "APPROVED" : "REJECTED"}`,
          );
        } else {
          console.log(
            `⚠️ [Monitor Socket] Approval already processed or not found: ${data.approvalId}`,
          );
        }
      },
    );

    // Handle container start
    socket.on(
      "start-container",
      async (data: { sessionId: string; containerName: string }) => {
        console.log("▶️ [Monitor Socket] Start container requested:", data);

        try {
          io.to(data.sessionId).emit("container-operation-started", {
            containerName: data.containerName,
            operation: "start",
          });

          let result;
          let method = "unknown";

          try {
            result = await executeMCPTool("tool.dockerStart", {
              containerName: data.containerName,
            });
            method = "MCP";
          } catch (mcpError: any) {
            console.warn(`⚠️ MCP start failed: ${mcpError.message}`);
            result = await runDockerStart({
              containerName: data.containerName,
            });
            method = "Direct Docker";
          }

          io.to(data.sessionId).emit("container-operation-completed", {
            containerName: data.containerName,
            operation: "start",
            success: result.success,
            method,
            message: result.success
              ? `✅ Container ${data.containerName} started`
              : `❌ Failed to start: ${result.error}`,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] Start error:", error);
          io.to(data.sessionId).emit("container-operation-error", {
            containerName: data.containerName,
            operation: "start",
            error: error.message,
          });
        }
      },
    );

    // Handle container stop
    socket.on(
      "stop-container",
      async (data: { sessionId: string; containerName: string }) => {
        console.log("⏸️ [Monitor Socket] Stop container requested:", data);

        try {
          io.to(data.sessionId).emit("container-operation-started", {
            containerName: data.containerName,
            operation: "stop",
          });

          let result;
          let method = "unknown";

          try {
            result = await executeMCPTool("tool.dockerStop", {
              containerName: data.containerName,
            });
            method = "MCP";
          } catch (mcpError: any) {
            console.warn(`⚠️ MCP stop failed: ${mcpError.message}`);
            result = await runDockerStop({
              containerName: data.containerName,
            });
            method = "Direct Docker";
          }

          io.to(data.sessionId).emit("container-operation-completed", {
            containerName: data.containerName,
            operation: "stop",
            success: result.success,
            method,
            message: result.success
              ? `✅ Container ${data.containerName} stopped`
              : `❌ Failed to stop: ${result.error}`,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] Stop error:", error);
          io.to(data.sessionId).emit("container-operation-error", {
            containerName: data.containerName,
            operation: "stop",
            error: error.message,
          });
        }
      },
    );

    // Handle Slack notification with channel
    socket.on(
      "send-slack-notification",
      async (data: {
        sessionId: string;
        containerName: string;
        channel: string;
        message: string;
        severity?: string;
        metadata?: Record<string, any>;
        includeLogSnippet?: boolean;
      }) => {
        console.log("📢 [Monitor Socket] Slack notification requested:", data);

        try {
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          if (!webhookUrl) {
            throw new Error(
              "Slack webhook URL not configured. Set SLACK_WEBHOOK_URL in environment variables.",
            );
          }

          // Optionally fetch logs if requested
          let logSnippet = undefined;
          if (data.includeLogSnippet) {
            try {
              const logsResult = await runDockerLogs({
                containerName: data.containerName,
                tail: 50,
                timestamps: false,
              });

              if (logsResult.success) {
                logSnippet = logsResult.logs;
              }
            } catch (err) {
              console.warn(
                "⚠️ [Monitor Socket] Could not fetch logs for Slack:",
                err,
              );
            }
          }

          let result;
          try {
            result = await executeMCPTool("tool.slackNotify", {
              webhookUrl,
              message: data.message,
              channel: data.channel,
              severity: data.severity || "info",
              includeLogSnippet: !!logSnippet,
              logSnippet: logSnippet,
              metadata: {
                Container: data.containerName,
                Timestamp: new Date().toLocaleString(),
                ...data.metadata,
              },
            });
          } catch (mcpError: any) {
            console.warn(
              `⚠️ [Monitor Socket] MCP Slack notify failed: ${mcpError.message}`,
            );
            result = await runSlackNotify({
              webhookUrl,
              message: data.message,
              channel: data.channel,
              severity: (data.severity as any) || "info",
              includeLogSnippet: !!logSnippet,
              logSnippet: logSnippet,
              metadata: {
                Container: data.containerName,
                Timestamp: new Date().toLocaleString(),
                ...data.metadata,
              },
            });
          }

          io.to(data.sessionId).emit("slack-notification-sent", {
            success: result.success,
            containerName: data.containerName,
            channel: data.channel,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] Slack notification error:", error);
          socket.emit("slack-notification-error", {
            containerName: data.containerName,
            error: error.message,
          });
        }
      },
    );

    // Handle manual refresh request
    socket.on(
      "refresh-container-metrics",
      async (data: { sessionId: string }) => {
        console.log("🔄 [Monitor Socket] Manual refresh requested:", data);

        io.to(data.sessionId).emit("refresh-started", {
          timestamp: new Date().toISOString(),
        });
      },
    );

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`🔌 [Monitor Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ [Monitor Socket] Socket handlers setup complete");
}

/**
 * Wait for restart approval with timeout - SINGLE RESPONSE
 */
function waitForRestartApproval(
  approvalId: string,
  containerName: string,
  sessionId: string,
  timeout: number = 30000,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const pending = pendingRestartApprovals.get(approvalId);
      if (pending && !pending.resolved) {
        pending.resolved = true;
        pendingRestartApprovals.delete(approvalId);
        console.log(
          `⏰ [Monitor Socket] Approval timeout for ${containerName}`,
        );
        resolve(false); // Default to reject on timeout
      }
    }, timeout);

    pendingRestartApprovals.set(approvalId, {
      resolve: (approved: boolean) => {
        clearTimeout(timeoutId);
        resolve(approved);
      },
      reject,
      containerName,
      sessionId,
      resolved: false,
      timestamp: Date.now(),
    });
  });
}
