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

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Export io instance for use in other modules
export { ioInstance as io };
