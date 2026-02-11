import { Server } from "socket.io";
import { ContinuousMonitor } from "../engine/tools/monitor.tool";

/**
 * Bridge monitor events to Socket.IO for real-time frontend updates
 */
export function setupMonitorSocketBridge(
  monitor: ContinuousMonitor,
  runId: string,
  io: Server,
) {
  console.log(`🌉 [Monitor Bridge] Setting up socket bridge for run: ${runId}`);

  // Forward check_completed events to the frontend
  monitor.on("check_completed", (data) => {
    console.log(
      `📡 [Monitor Bridge] Broadcasting check_completed to run: ${runId}`,
    );

    io.to(runId).emit("monitor_check_completed", {
      runId,
      checkNumber: monitor.getState().checkCount,
      timestamp: new Date().toISOString(),
      ...data,
    });
  });

  // Forward alert events
  monitor.on("alert", (alert) => {
    console.log(`📡 [Monitor Bridge] Broadcasting alert to run: ${runId}`);
    console.log(`   Alert: ${alert.message} (${alert.severity})`);

    io.to(runId).emit("monitor_alert", {
      runId,
      ...alert,
    });
  });

  // Forward monitor started event
  monitor.on("started", (data) => {
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
  monitor.on("stopped", (data) => {
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
