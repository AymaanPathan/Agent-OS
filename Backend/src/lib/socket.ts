  import { Server, Socket } from "socket.io";
  import { sendApproval } from "../workflows/executeWorkflow";

  let ioInstance: Server;

  export function setupSocketHandlers(io: Server) {
    ioInstance = io;

    io.on("connection", (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Join a specific workflow run room
      socket.on("join-run", (runId: string) => {
        socket.join(runId);
        console.log(`📥 Client ${socket.id} joined run: ${runId}`);

        socket.emit("joined", {
          runId,
          message: "Successfully joined workflow run",
        });
      });

      // Leave a workflow run room
      socket.on("leave-run", (runId: string) => {
        socket.leave(runId);
        console.log(`📤 Client ${socket.id} left run: ${runId}`);
      });

      // Handle approval responses
      socket.on(
        "approval_response",
        (data: { runId: string; nodeId: string; approved: boolean }) => {
          console.log(`✅ Approval response received:`, data);

          const result = data.approved ? "approved" : "rejected";
          const success = sendApproval(data.runId, result);

          if (success) {
            io.to(data.runId).emit("approval_received", {
              nodeId: data.nodeId,
              approved: data.approved,
              timestamp: new Date().toISOString(),
            });
          } else {
            socket.emit("error", {
              message: "Failed to process approval",
              runId: data.runId,
            });
          }
        },
      );

      // ✅ NEW: Handle monitor control commands from frontend
      socket.on("monitor_pause", (data: { runId: string; monitorId: string }) => {
        console.log(`⏸️ Monitor pause requested:`, data);
        // This could be used to pause/resume monitoring if you add that feature
        io.to(data.runId).emit("monitor_paused", {
          monitorId: data.monitorId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on(
        "monitor_resume",
        (data: { runId: string; monitorId: string }) => {
          console.log(`▶️ Monitor resume requested:`, data);
          io.to(data.runId).emit("monitor_resumed", {
            monitorId: data.monitorId,
            timestamp: new Date().toISOString(),
          });
        },
      );

      // Disconnect handler
      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    return io;
  }

  // Export io instance for use in other modules
  export { ioInstance as io };

  /**
   * Emit a monitor event to all clients in a run room
   * Used by monitorSocketBridge.ts
   */
  export function emitMonitorEvent(runId: string, event: string, data: any) {
    if (!ioInstance) {
      console.warn("⚠️ Socket.IO not initialized, cannot emit monitor event");
      return;
    }

    console.log(`📡 [Socket] Emitting ${event} to run: ${runId}`);
    ioInstance.to(runId).emit(event, data);
  }
