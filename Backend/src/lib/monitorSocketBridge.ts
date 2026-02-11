import { Server } from "socket.io";
import { ContinuousMonitor } from "../engine/tools/monitor.tool";
import { executeMCPTool } from "../engine/tools/mcpTools.registry";
import { runAILogAnalysis } from "../engine/tools/aiAnalyzer.tool";

// ====================================
// 🌉 MONITOR SOCKET BRIDGE
// ====================================

export function setupMonitorSocketBridge(
  monitor: ContinuousMonitor,
  runId: string,
  io: Server,
) {
  console.log(`🌉 [Monitor Bridge] Setting up socket bridge for run: ${runId}`);

  // Forward check_completed events
  // Around line 25, update the check_completed handler:

  monitor.on("check_completed", (data: any) => {
    console.log(
      `📡 [Monitor Bridge] Broadcasting check_completed to run: ${runId}`,
    );

    // ✅ FIX: Ensure container data includes names and logs
    const enrichedData = {
      runId,
      checkNumber: monitor.getState().checkCount,
      timestamp: new Date().toISOString(),
      ...data,
      result: {
        ...data.result,
        containers:
          data.result?.containers?.map((c: any) => ({
            name: c.containerName || c.name, // ✅ FIX: Ensure name is present
            status: c.containerStatus || c.status,
            applicationHealthy: c.applicationHealthy,
            cpuPercent: c.cpuPercent,
            memPercent: c.memPercent,
            httpHealthStatus: c.httpHealthStatus,
            logs: c.logs, // ✅ FIX: Pass logs through
          })) || [],
      },
    };

    io.to(runId).emit("monitor_check_completed", enrichedData);
  });

  // Forward alert events
  monitor.on("alert", (alert: any) => {
    console.log(`📡 [Monitor Bridge] Broadcasting alert to run: ${runId}`);
    io.to(runId).emit("monitor_alert", {
      runId,
      ...alert,
    });
  });

  // Forward monitor started event
  monitor.on("started", (data: any) => {
    console.log(
      `📡 [Monitor Bridge] Broadcasting monitor_started to run: ${runId}`,
    );
    io.to(runId).emit("monitor_started", {
      runId,
      config: data.config,
      timestamp: new Date().toISOString(),
    });
  });

  // Forward monitor stopped event
  monitor.on("stopped", (data: any) => {
    console.log(
      `📡 [Monitor Bridge] Broadcasting monitor_stopped to run: ${runId}`,
    );
    io.to(runId).emit("monitor_stopped", {
      runId,
      finalState: data.state,
      timestamp: new Date().toISOString(),
    });
  });

  console.log(
    `✅ [Monitor Bridge] Socket bridge established for run: ${runId}`,
  );
}

// ====================================
// 🤖 AI FIX HANDLER
// ====================================

export function setupAIFixHandler(io: Server) {
  console.log("🤖 [AI Fix Handler] Setting up AI fix handler");

  io.on("connection", (socket) => {
    socket.on(
      "ai_fix_container",
      async (data: { runId: string; containerName: string }) => {
        const { runId, containerName } = data;

        // ✅ ADD VALIDATION
        if (
          !containerName ||
          containerName === "undefined" ||
          typeof containerName !== "string"
        ) {
          console.error(
            "❌ [AI Fix] Invalid container name received:",
            containerName,
          );
          socket.emit("ai_fix_result", {
            runId,
            containerName: containerName || "unknown",
            success: false,
            error: "Invalid container name",
            message: "Invalid container name provided",
            duration: 0,
          });
          return;
        }

        console.log(
          `🤖 [AI Fix] Received AI fix request for container: ${containerName}`,
        );

        const startTime = Date.now();

        try {
          // Step 1: Fetch container logs via MCP
          console.log(`📋 [AI Fix] Fetching logs for ${containerName}...`);

          const logsResult = await executeMCPTool("tool.dockerLogs", {
            containerName,
            tail: 200,
            timestamps: true,
          });

          if (!logsResult.success || !logsResult.logs) {
            throw new Error(
              `Failed to fetch logs: ${logsResult.error || "No logs available"}`,
            );
          }

          // Step 2: Analyze logs with AI
          console.log(`🧠 [AI Fix] Analyzing logs with AI...`);

          const analysisResult = await runAILogAnalysis({
            logs: logsResult.logs,
            containerNames: [containerName],
            context: `Analyzing container ${containerName} for automated recovery`,
          });

          console.log(`🧠 [AI Fix] Analysis complete:`, {
            success: analysisResult.success,
            confidence: analysisResult.confidence,
          });

          // Step 3: Send analysis results
          io.to(runId).emit("ai_fix_progress", {
            runId,
            containerName,
            stage: "analysis_complete",
            analysis: {
              summary: analysisResult.summary,
              rootCause: analysisResult.rootCause,
              confidence: analysisResult.confidence,
              suggestedFixes: analysisResult.suggestedFixes,
            },
          });

          // Step 4: Auto-fix if high confidence
          const shouldAutoFix =
            analysisResult.success &&
            analysisResult.confidence === "high" &&
            (analysisResult.errorCategory === "crash" ||
              analysisResult.errorCategory === "memory_leak" ||
              analysisResult.errorCategory === "resource_exhaustion");

          if (shouldAutoFix) {
            console.log(`🔧 [AI Fix] Applying fix for ${containerName}...`);

            io.to(runId).emit("ai_fix_progress", {
              runId,
              containerName,
              stage: "applying_fix",
              message: "Restarting container...",
            });

            const restartResult = await executeMCPTool("tool.dockerRestart", {
              containerName,
              timeout: 10,
            });

            if (restartResult.success) {
              console.log(
                `✅ [AI Fix] Container ${containerName} restarted successfully`,
              );

              // Wait for stabilization
              await new Promise((resolve) => setTimeout(resolve, 3000));

              // Verify the fix
              const verifyLogs = await executeMCPTool("tool.dockerLogs", {
                containerName,
                tail: 50,
                timestamps: true,
              });

              const totalDuration = Date.now() - startTime;

              io.to(runId).emit("ai_fix_result", {
                runId,
                containerName,
                success: true,
                message: `Successfully fixed ${containerName}`,
                analysis: {
                  summary: analysisResult.summary,
                  rootCause: analysisResult.rootCause,
                  confidence: analysisResult.confidence,
                  suggestedFixes: analysisResult.suggestedFixes,
                },
                action: "Container restarted",
                verificationLogs:
                  verifyLogs.logs || "Unable to fetch verification logs",
                duration: totalDuration,
              });
            } else {
              throw new Error(
                `Restart failed: ${restartResult.error || "Unknown error"}`,
              );
            }
          } else {
            // Manual intervention required
            console.log(
              `⚠️ [AI Fix] Manual intervention required for ${containerName}`,
            );

            io.to(runId).emit("ai_fix_result", {
              runId,
              containerName,
              success: false,
              message: `Manual intervention required for ${containerName}`,
              analysis: {
                summary: analysisResult.summary,
                rootCause: analysisResult.rootCause,
                confidence: analysisResult.confidence,
                suggestedFixes: analysisResult.suggestedFixes,
              },
              reason: `Low confidence (${analysisResult.confidence}) or complex issue`,
              manualSteps: analysisResult.suggestedFixes,
            });
          }
        } catch (error: any) {
          const totalDuration = Date.now() - startTime;
          console.error(
            `❌ [AI Fix] Error fixing ${containerName}:`,
            error.message,
          );

          io.to(runId).emit("ai_fix_result", {
            runId,
            containerName,
            success: false,
            error: error.message || "Unknown error",
            message: `Failed to fix ${containerName}`,
            duration: totalDuration,
          });
        }
      },
    );
  });

  console.log("✅ [AI Fix Handler] Handler setup complete");
}
