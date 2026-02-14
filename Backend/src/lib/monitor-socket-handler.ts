import { Server, Socket } from "socket.io";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";
import { runDockerRestart, runDockerLogs } from "../engine/tools/docker.tool";
import {
  runDockerStop,
  runDockerStart,
} from "../engine/tools/docker.extra.tool";
import { runAILogAnalysis } from "../engine/tools/aiAnalyzer.tool";
import { runSlackNotify } from "../engine/tools/slack.tool";

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

setInterval(() => {
  const now = Date.now();
  const timeout = 60000;

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

    socket.on("leave-monitor", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(
        `📤 [Monitor Socket] Client ${socket.id} left session: ${sessionId}`,
      );
    });

    socket.on(
      "ai-analyze-container",
      async (data: { sessionId: string; containerName: string }) => {
        console.log("🧠 [Monitor Socket] AI analysis requested:", data);

        try {
          io.to(data.sessionId).emit("ai-analysis-started", {
            containerName: data.containerName,
          });

          let logsResult;
          try {
            logsResult = await executeMCPTool("tool.dockerLogs", {
              containerName: data.containerName,
              tail: 200,
            });
          } catch (mcpError: any) {
            logsResult = await runDockerLogs({
              containerName: data.containerName,
              tail: 200,
              timestamps: false,
            });
          }

          if (!logsResult.success) {
            throw new Error(
              `Failed to fetch container logs: ${logsResult.error || "Unknown error"}`,
            );
          }

          let analysis;
          try {
            analysis = await executeMCPTool("agent.aiAnalyzer", {
              logs: { [data.containerName]: logsResult.logs },
              containerNames: [data.containerName],
              context: `Analyzing container ${data.containerName} for issues`,
            });
          } catch (mcpError: any) {
            analysis = await runAILogAnalysis({
              logs: { [data.containerName]: logsResult.logs },
              containerNames: [data.containerName],
              context: `Analyzing container ${data.containerName} for issues`,
              provider: "groq",
            });
          }

          io.to(data.sessionId).emit("ai-analysis-complete", {
            containerName: data.containerName,
            analysis,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] AI analysis error:", error);
          io.to(data.sessionId).emit("ai-analysis-error", {
            containerName: data.containerName,
            error: error.message,
          });
        }
      },
    );

    socket.on(
      "request-restart-approval",
      async (data: {
        sessionId: string;
        containerName: string;
        reason: string;
      }) => {
        console.log("🔐 [Monitor Socket] Restart approval requested:", data);

        const approvalId = `restart-${data.sessionId}-${data.containerName}-${Date.now()}`;

        io.to(data.sessionId).emit("restart-approval-required", {
          approvalId,
          containerName: data.containerName,
          reason: data.reason,
          timestamp: new Date().toISOString(),
        });

        try {
          const approved = await waitForRestartApproval(
            approvalId,
            data.containerName,
            data.sessionId,
            30000,
          );

          if (approved) {
            io.to(data.sessionId).emit("container-restarting", {
              containerName: data.containerName,
            });

            let result;
            let method = "unknown";

            try {
              result = await executeMCPTool("tool.dockerRestart", {
                containerName: data.containerName,
                timeout: 30,
              });
              method = "MCP";
            } catch (mcpError: any) {
              result = await runDockerRestart({
                containerName: data.containerName,
                timeout: 30,
              });
              method = "Direct Docker";
            }

            io.to(data.sessionId).emit("restart-completed", {
              containerName: data.containerName,
              success: result.success,
              method,
              message: result.success
                ? `✅ Container ${data.containerName} restarted successfully`
                : `❌ Failed to restart ${data.containerName}: ${result.error || "Unknown error"}`,
            });
          } else {
            io.to(data.sessionId).emit("restart-rejected", {
              containerName: data.containerName,
              message: `Restart request was rejected`,
            });
          }
        } catch (error: any) {
          console.error("❌ [Monitor Socket] Restart flow error:", error);
          io.to(data.sessionId).emit("restart-error", {
            containerName: data.containerName,
            message: `Error during restart: ${error.message}`,
          });
        }
      },
    );

    socket.on(
      "restart-approval-response",
      (data: { approvalId: string; approved: boolean }) => {
        const pending = pendingRestartApprovals.get(data.approvalId);

        if (pending && !pending.resolved) {
          pending.resolved = true;
          pending.resolve(data.approved);
          pendingRestartApprovals.delete(data.approvalId);
        }
      },
    );

    socket.on(
      "start-container",
      async (data: { sessionId: string; containerName: string }) => {
        try {
          io.to(data.sessionId).emit("container-operation-started", {
            containerName: data.containerName,
            operation: "start",
          });

          let result;
          try {
            result = await executeMCPTool("tool.dockerStart", {
              containerName: data.containerName,
            });
          } catch {
            result = await runDockerStart({
              containerName: data.containerName,
            });
          }

          io.to(data.sessionId).emit("container-operation-completed", {
            containerName: data.containerName,
            operation: "start",
            success: result.success,
            message: result.success
              ? `✅ Container started`
              : `❌ Failed to start`,
          });
        } catch (error: any) {
          io.to(data.sessionId).emit("container-operation-error", {
            containerName: data.containerName,
            operation: "start",
            error: error.message,
          });
        }
      },
    );

    socket.on(
      "stop-container",
      async (data: { sessionId: string; containerName: string }) => {
        try {
          io.to(data.sessionId).emit("container-operation-started", {
            containerName: data.containerName,
            operation: "stop",
          });

          let result;
          try {
            result = await executeMCPTool("tool.dockerStop", {
              containerName: data.containerName,
            });
          } catch {
            result = await runDockerStop({
              containerName: data.containerName,
            });
          }

          io.to(data.sessionId).emit("container-operation-completed", {
            containerName: data.containerName,
            operation: "stop",
            success: result.success,
            message: result.success
              ? `✅ Container stopped`
              : `❌ Failed to stop`,
          });
        } catch (error: any) {
          io.to(data.sessionId).emit("container-operation-error", {
            containerName: data.containerName,
            operation: "stop",
            error: error.message,
          });
        }
      },
    );

    socket.on(
      "send-slack-notification",
      async (data: {
        sessionId: string;
        containerName: string;
        channel: string;
        message: string;
        severity?: string;
        metadata?: Record<string, any>;
      }) => {
        try {
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          if (!webhookUrl) {
            throw new Error("Slack webhook URL not configured");
          }

          let result;
          try {
            result = await executeMCPTool("tool.slackNotify", {
              webhookUrl,
              message: data.message,
              channel: data.channel,
              severity: data.severity || "info",
              metadata: {
                Container: data.containerName,
                Timestamp: new Date().toLocaleString(),
                ...data.metadata,
              },
            });
          } catch {
            result = await runSlackNotify({
              webhookUrl,
              message: data.message,
              channel: data.channel,
              severity: (data.severity as any) || "info",
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
          socket.emit("slack-notification-error", {
            containerName: data.containerName,
            error: error.message,
          });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(`🔌 [Monitor Socket] Client disconnected: ${socket.id}`);
    });
  });
}

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
        resolve(false);
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
