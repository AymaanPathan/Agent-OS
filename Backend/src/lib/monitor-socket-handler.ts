import { Server, Socket } from "socket.io";
import { activeMonitors } from "../routes/MonitorApi.routes";
import { setupMonitorSocketBridge } from "./monitorSocketBridge";

/**
 * Setup Socket.IO handlers for monitor functionality
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

    // Handle AI fix container request
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
            socket.emit("ai-fix-result", {
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
          });

          // Import AI analysis tool
          const { runAILogAnalysis } =
            await import("../engine/tools/aiAnalyzer.tool");
          const { runDockerLogs } = await import("../engine/tools/docker.tool");
          const { runDockerRestart } =
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
          const analysis = await runAILogAnalysis({
            logs: logsResult.logs,
            containerNames: [data.containerName],
            context: "Container health recovery analysis",
          });

          // Emit analysis complete
          socket.emit("ai-fix-progress", {
            stage: "analysis_complete",
            containerName: data.containerName,
            analysis: {
              summary: analysis.summary,
              rootCause: analysis.rootCause,
              confidence: analysis.confidence,
              suggestedFixes: analysis.suggestedFixes,
            },
          });

          // Step 3: Apply fix (restart for now - you can enhance this)
          socket.emit("ai-fix-progress", {
            stage: "applying_fix",
            containerName: data.containerName,
            message: "Restarting container...",
          });

          const restartResult = await runDockerRestart({
            containerName: data.containerName,
            timeout: 10,
          });

          // Step 4: Emit final result
          socket.emit("ai-fix-result", {
            success: restartResult.success,
            containerName: data.containerName,
            message: restartResult.success
              ? "Container restarted successfully"
              : "Container restart failed",
            analysis,
            action: "restart",
          });

          console.log(
            `✅ [Monitor Socket] AI fix completed for: ${data.containerName}`,
          );
        } catch (error: any) {
          console.error(`❌ [Monitor Socket] AI fix error:`, error);

          socket.emit("ai-fix-result", {
            success: false,
            containerName: data.containerName,
            message: `Fix failed: ${error.message}`,
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
