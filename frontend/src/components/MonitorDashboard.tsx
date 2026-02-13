/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Play, Pause, Settings, X as CloseIcon } from "lucide-react";
import { io, Socket } from "socket.io-client";

type MonitorStats = {
  totalContainers: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  checkCount: number;
  lastCheckTime: string;
  uptime: number;
};

export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState<MonitorStats>({
    totalContainers: 0,
    healthyCount: 0,
    warningCount: 0,
    criticalCount: 0,
    checkCount: 0,
    lastCheckTime: "",
    uptime: 0,
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionId] = useState(
    () => `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    interval: 30,
    autoFix: true,
    alertOnChange: true,
  });

  // Socket connection
  useEffect(() => {
    console.log("🔌 Initializing socket connection...");
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        transports: ["websocket", "polling"],
      },
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      newSocket.emit("join-monitor", sessionId);
    });

    newSocket.on("monitor-joined", (data) => {
      console.log("✅ Joined monitor session:", data);
    });

    newSocket.on("monitor-check-completed", (data) => {
      console.log("📊 Check completed:", data);
      if (data.result?.containers) {
        setStats({
          totalContainers: data.result.containers.length,
          healthyCount: data.result.containers.filter(
            (c: any) => c.status === "running",
          ).length,
          warningCount: 0,
          criticalCount: data.result.containers.filter(
            (c: any) => c.status !== "running",
          ).length,
          checkCount: data.checkNumber || stats.checkCount + 1,
          lastCheckTime: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
        });
      }
    });

    return () => {
      console.log("🔌 Disconnecting socket...");
      newSocket.emit("leave-monitor", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId]);

  const handleStartMonitoring = async () => {
    try {
      console.log("🟢 Starting monitoring...");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/monitor/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            config: {
              targets: "containers",
              interval: settings.interval,
              autoFix: settings.autoFix,
              alertOnChange: settings.alertOnChange,
            },
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setIsMonitoring(true);
        setStartTime(Date.now());
        console.log("✅ Monitoring started successfully");
      } else {
        console.error("❌ Failed to start monitoring:", data.error);
      }
    } catch (error: any) {
      console.error("❌ Error starting monitoring:", error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/monitor/stop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setIsMonitoring(false);
        console.log("✅ Monitoring stopped");
      }
    } catch (error) {
      console.error("❌ Error stopping monitoring:", error);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-[rgb(var(--border))] surface-elevated px-6 py-4 flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:surface transition-colors"
              title="Close"
            >
              <CloseIcon className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
                <Activity className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <div className="text-base font-bold text-[rgb(var(--foreground))]">
                  Container Monitoring
                </div>
                <div className="text-xs text-[rgb(var(--foreground-muted))]">
                  Real-time monitoring with AI auto-healing
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                  : "hover:surface text-[rgb(var(--foreground-muted))]"
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--error))] hover:bg-[rgb(var(--error))]/90 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Stop
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {!isMonitoring ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl surface-elevated border border-[rgb(var(--border))] mb-6">
                <Activity className="h-10 w-10 text-[rgb(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
                Start Container Monitoring
              </h2>
              <p className="text-[rgb(var(--foreground-muted))] mb-6 max-w-md mx-auto">
                Monitor your Docker containers in real-time with AI-powered
                auto-healing capabilities
              </p>
              <button
                onClick={handleStartMonitoring}
                className="px-6 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Monitoring
              </button>
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-8 w-8 text-[rgb(var(--primary))] mx-auto mb-4 animate-pulse" />
              <p className="text-[rgb(var(--foreground-muted))]">
                Monitoring active... Check #{stats.checkCount}
              </p>
              <div className="mt-4 text-sm text-[rgb(var(--foreground))]">
                Total: {stats.totalContainers} | Healthy: {stats.healthyCount} |
                Critical: {stats.criticalCount}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
