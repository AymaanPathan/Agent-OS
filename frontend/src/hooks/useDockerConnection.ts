"use client";

import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface DockerStatus {
  connected: boolean;
  mode: "local" | "remote";
  host?: string;
  version?: string;
  containers?: number;
  error?: string;
  timestamp: string;
}

export function useDockerConnection() {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const newSocket = io(apiUrl, {
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("🔌 Connected to Docker status socket");
    });

    newSocket.on("docker-status", (dockerStatus: DockerStatus) => {
      console.log("📡 Received Docker status update:", dockerStatus);
      setStatus(dockerStatus);
      setIsLoading(false);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Disconnected from Docker status socket");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Check Docker status
  const checkStatus = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/docker/status?refresh=true`);
      const data = await response.json();

      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to check Docker status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    isConnected: status?.connected ?? false,
    checkStatus,
  };
}
