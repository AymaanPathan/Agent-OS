/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from "socket.io";
import { ContinuousMonitor } from "../engine/tools/monitor.tool";

/**
 * Setup socket bridge for monitor events
 * This connects the monitor's EventEmitter to Socket.IO
 */
export function setupMonitorSocketBridge(
  monitor: ContinuousMonitor,
  sessionId: string,
  io: Server,
) {
  console.log("🔌 [Monitor Bridge] Setting up socket bridge for:", sessionId);

  // Forward check_completed events to socket
  monitor.on("check_completed", (data) => {
    console.log(
      "📡 [Monitor Bridge] Forwarding check_completed to room:",
      sessionId,
    );
    io.to(sessionId).emit("monitor-check-completed", data);
  });

  // Forward alert events to socket
  monitor.on("alert", (alert) => {
    console.log("🚨 [Monitor Bridge] Forwarding alert to room:", sessionId);
    io.to(sessionId).emit("monitor-alert", alert);
  });

  // Forward started event
  monitor.on("started", (data) => {
    console.log("🟢 [Monitor Bridge] Monitor started");
    io.to(sessionId).emit("monitor-started", data);
  });

  // Forward stopped event
  monitor.on("stopped", (data) => {
    console.log("🔴 [Monitor Bridge] Monitor stopped");
    io.to(sessionId).emit("monitor-stopped", data);
  });

  console.log("✅ [Monitor Bridge] Bridge setup complete");
}
