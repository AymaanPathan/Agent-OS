import { Server, Socket } from "socket.io";
import { activeMonitors } from "../routes/MonitorApi.routes";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";
import { runAILogAnalysis } from "../engine/tools/aiAnalyzer.tool";

export function setupMonitorSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 [Monitor Socket] Client connected: ${socket.id}`);

    // Join monitor session
    socket.on("join-monitor", (sessionId: string) => {
      socket.join(`monitor-${sessionId}`);
      console.log(
        `📥 [Monitor Socket] Client ${socket.id} joined monitor: ${sessionId}`,
      );

      // Setup event forwarding for this monitor
      const monitor = activeMonitors.get(sessionId);
      if (monitor) {
        setupMonitorEventForwarding(monitor, sessionId, io);
      }

      socket.emit("monitor-joined", {
        sessionId,
        message: "Successfully joined monitoring session",
      });
    });

    // Leave monitor session
    socket.on("leave-monitor", (sessionId: string) => {
      socket.leave(`monitor-${sessionId}`);
      console.log(
        `📤 [Monitor Socket] Client ${socket.id} left monitor: ${sessionId}`,
      );
    });

    // AI Fix request
    socket.on(
      "ai-fix-container",
      async (data: { sessionId: string; containerName: string }) => {
        const { sessionId, containerName } = data;

        if (
          !containerName ||
          containerName === "undefined" ||
          typeof containerName !== "string"
        ) {
          console.error(
            "❌ [Monitor Socket] Invalid container name:",
            containerName,
          );
          socket.emit("ai-fix-result", {
            sessionId,
            containerName: containerName || "unknown",
            success: false,
            error: "Invalid container name",
          });
          return;
        }

        console.log(`🤖 [Monitor Socket] AI fix request for: ${containerName}`);

        const startTime = Date.now();

        try {
          // Fetch logs
          const logsResult = await executeMCPTool("tool.dockerLogs", {
            containerName,
            tail: 200,
            timestamps: true,
          });

          if (!logsResult.success || !logsResult.logs) {
            throw new Error("Failed to fetch logs");
          }

          // Analyze with AI
          io.to(`monitor-${sessionId}`).emit("ai-fix-progress", {
            sessionId,
            containerName,
            stage: "analyzing",
            message: "Analyzing logs with AI...",
          });

          const analysisResult = await runAILogAnalysis({
            logs: logsResult.logs,
            containerNames: [containerName],
            context: `Analyzing container ${containerName} for automated recovery`,
          });

          // Send analysis results
          io.to(`monitor-${sessionId}`).emit("ai-fix-progress", {
            sessionId,
            containerName,
            stage: "analysis_complete",
            analysis: {
              summary: analysisResult.summary,
              rootCause: analysisResult.rootCause,
              confidence: analysisResult.confidence,
              suggestedFixes: analysisResult.suggestedFixes,
            },
          });

          // Determine if auto-fix is possible
          const canAutoFix =
            analysisResult.success && analysisResult.confidence !== "low";
          const restartRecommended =
            analysisResult.errorCategory === "crash" ||
            analysisResult.errorCategory === "memory_leak" ||
            analysisResult.suggestedFixes.some(
              (fix: string) =>
                fix.toLowerCase().includes("restart") ||
                fix.toLowerCase().includes("reboot"),
            );

          if (!canAutoFix) {
            io.to(`monitor-${sessionId}`).emit("ai-fix-result", {
              sessionId,
              containerName,
              success: true,
              message: `AI Analysis Complete (${analysisResult.confidence} confidence)`,
              analysis: analysisResult,
              action: "analysis_only",
              duration: Date.now() - startTime,
            });
            return;
          }

          if (!restartRecommended) {
            io.to(`monitor-${sessionId}`).emit("ai-fix-result", {
              sessionId,
              containerName,
              success: true,
              message: `AI Recommendations (${analysisResult.confidence} confidence)`,
              analysis: analysisResult,
              action: "manual_steps_provided",
              manualSteps: analysisResult.suggestedFixes,
              duration: Date.now() - startTime,
            });
            return;
          }

          // Auto-fix with restart
          io.to(`monitor-${sessionId}`).emit("ai-fix-progress", {
            sessionId,
            containerName,
            stage: "applying_fix",
            message: "Restarting container...",
          });

          const restartResult = await executeMCPTool("tool.dockerRestart", {
            containerName,
            timeout: 10,
          });

          if (restartResult.success) {
            // Wait for stabilization
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Verify
            const verifyLogs = await executeMCPTool("tool.dockerLogs", {
              containerName,
              tail: 50,
              timestamps: true,
            });

            io.to(`monitor-${sessionId}`).emit("ai-fix-result", {
              sessionId,
              containerName,
              success: true,
              message: "✅ Container restarted successfully",
              analysis: analysisResult,
              action: "container_restarted",
              verificationLogs: verifyLogs.logs || "Unable to fetch logs",
              duration: Date.now() - startTime,
            });
          } else {
            throw new Error(
              `Restart failed: ${restartResult.error || "Unknown error"}`,
            );
          }
        } catch (error: any) {
          console.error(`❌ [Monitor Socket] AI fix error: ${error.message}`);
          io.to(`monitor-${sessionId}`).emit("ai-fix-result", {
            sessionId,
            containerName,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(`🔌 [Monitor Socket] Client disconnected: ${socket.id}`);
    });
  });
}

function setupMonitorEventForwarding(
  monitor: any,
  sessionId: string,
  io: Server,
) {
  const room = `monitor-${sessionId}`;

  // Forward check completed events
  monitor.on("check_completed", (data: any) => {
    io.to(room).emit("monitor-check-completed", {
      sessionId,
      checkNumber: monitor.getState().checkCount,
      timestamp: new Date().toISOString(),
      ...data,
    });
  });

  // Forward alerts
  monitor.on("alert", (alert: any) => {
    io.to(room).emit("monitor-alert", {
      sessionId,
      ...alert,
    });
  });

  // Forward started event
  monitor.on("started", (data: any) => {
    io.to(room).emit("monitor-started", {
      sessionId,
      config: data.config,
      timestamp: new Date().toISOString(),
    });
  });

  // Forward stopped event
  monitor.on("stopped", (data: any) => {
    io.to(room).emit("monitor-stopped", {
      sessionId,
      finalState: data.state,
      timestamp: new Date().toISOString(),
    });
  });
}
