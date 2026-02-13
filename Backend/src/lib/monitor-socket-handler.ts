import { Server, Socket } from "socket.io";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";

// Store pending restart approvals
const pendingRestartApprovals = new Map<
  string,
  {
    resolve: (approved: boolean) => void;
    reject: (error: Error) => void;
    containerName: string;
    sessionId: string;
  }
>();

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
          // Fetch logs first
          const logsResult = await executeMCPTool("tool.dockerLogs", {
            containerName: data.containerName,
            tail: 200,
          });

          if (!logsResult.success) {
            throw new Error("Failed to fetch container logs");
          }

          // Run AI analysis
          const analysis = await executeMCPTool("agent.aiAnalyzer", {
            logs: { [data.containerName]: logsResult.logs },
            containerNames: [data.containerName],
            context: `Analyzing container ${data.containerName} for issues`,
          });

          // Send analysis results back
          io.to(data.sessionId).emit("ai-analysis-complete", {
            containerName: data.containerName,
            analysis,
          });
        } catch (error: any) {
          console.error("❌ [Monitor Socket] AI analysis error:", error);
          socket.emit("ai-analysis-error", {
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

        // Wait for approval with timeout
        const approved = await waitForRestartApproval(
          approvalId,
          data.containerName,
          data.sessionId,
          30000, // 30 second timeout
        );

        if (approved) {
          console.log(
            `✅ [Monitor Socket] Restart approved for ${data.containerName}`,
          );

          // Execute restart
          try {
            const result = await executeMCPTool("tool.dockerRestart", {
              containerName: data.containerName,
              timeout: 30,
            });

            io.to(data.sessionId).emit("restart-completed", {
              containerName: data.containerName,
              success: result.success,
              message: result.success
                ? `Container ${data.containerName} restarted successfully`
                : `Failed to restart ${data.containerName}: ${result.error}`,
            });
          } catch (error: any) {
            io.to(data.sessionId).emit("restart-completed", {
              containerName: data.containerName,
              success: false,
              message: `Restart failed: ${error.message}`,
            });
          }
        } else {
          console.log(
            `❌ [Monitor Socket] Restart rejected for ${data.containerName}`,
          );

          io.to(data.sessionId).emit("restart-rejected", {
            containerName: data.containerName,
            message: `Restart request for ${data.containerName} was rejected`,
          });
        }
      },
    );

    // Handle restart approval response
    socket.on(
      "restart-approval-response",
      (data: { approvalId: string; approved: boolean }) => {
        console.log("📨 [Monitor Socket] Approval response:", data);

        const pending = pendingRestartApprovals.get(data.approvalId);
        if (pending) {
          pending.resolve(data.approved);
          pendingRestartApprovals.delete(data.approvalId);
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
      }) => {
        console.log("📢 [Monitor Socket] Slack notification requested:", data);

        try {
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          if (!webhookUrl) {
            throw new Error("Slack webhook URL not configured");
          }

          const result = await executeMCPTool("tool.slackNotify", {
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

          socket.emit("slack-notification-sent", {
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

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`🔌 [Monitor Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ [Monitor Socket] Socket handlers setup complete");
}

/**
 * Wait for restart approval with timeout
 */
function waitForRestartApproval(
  approvalId: string,
  containerName: string,
  sessionId: string,
  timeout: number = 30000,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRestartApprovals.delete(approvalId);
      resolve(false); // Default to reject on timeout
    }, timeout);

    pendingRestartApprovals.set(approvalId, {
      resolve: (approved: boolean) => {
        clearTimeout(timeoutId);
        resolve(approved);
      },
      reject,
      containerName,
      sessionId,
    });
  });
}
