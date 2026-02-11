/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Server,
  Clock,
  Zap,
} from "lucide-react";

type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  timestamp: string;
};

type MonitorAlert = {
  timestamp: string;
  message: string;
  severity: "info" | "warning" | "critical";
  details: any;
};

export function MonitorDashboardPanel({
  socket,
  runId,
}: {
  socket: any;
  runId: string;
}) {
  const [metrics, setMetrics] = useState<ContainerMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for monitor started
    socket.on("monitor_started", (data: any) => {
      console.log("🟢 Monitor started:", data);
      setIsMonitoring(true);
    });

    // Listen for check completed events
    socket.on("monitor_check_completed", (data: any) => {
      console.log("📊 Monitor check completed:", data);
      setCheckCount(data.checkNumber);
      setLastCheckTime(data.timestamp);

      if (data.metrics) {
        setMetrics(data.metrics);
      }
    });

    // Listen for alerts
    socket.on("monitor_alert", (alert: MonitorAlert) => {
      console.log("🚨 Monitor alert:", alert);
      setAlerts((prev) => [...prev, alert].slice(-10)); // Keep last 10 alerts
    });

    // Listen for monitor stopped
    socket.on("monitor_stopped", (data: any) => {
      console.log("🔴 Monitor stopped:", data);
      setIsMonitoring(false);
    });

    return () => {
      socket.off("monitor_started");
      socket.off("monitor_check_completed");
      socket.off("monitor_alert");
      socket.off("monitor_stopped");
    };
  }, [socket]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HEALTHY":
        return {
          bg: "bg-green-500/10",
          text: "text-green-400",
          border: "border-green-500/20",
        };
      case "WARNING":
        return {
          bg: "bg-yellow-500/10",
          text: "text-yellow-400",
          border: "border-yellow-500/20",
        };
      case "CRITICAL":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
        };
      default:
        return {
          bg: "bg-zinc-500/10",
          text: "text-zinc-400",
          border: "border-zinc-500/20",
        };
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-zinc-400" />;
    }
  };

  if (!isMonitoring && metrics.length === 0) {
    return null; // Don't show if monitoring hasn't started
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Monitor Status Header */}
      <div className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Continuous Monitoring
              </h3>
              <p className="text-xs text-zinc-400">
                {isMonitoring ? "🟢 Active" : "🔴 Stopped"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-white">
              Check #{checkCount}
            </div>
            <div className="text-xs text-zinc-500">
              {lastCheckTime
                ? new Date(lastCheckTime).toLocaleTimeString()
                : "—"}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-black/20 p-3 border border-white/5">
            <div className="text-xs text-zinc-500 mb-1">Healthy</div>
            <div className="text-lg font-bold text-green-400">
              {metrics.filter((m) => m.severity === "HEALTHY").length}
            </div>
          </div>
          <div className="rounded-lg bg-black/20 p-3 border border-white/5">
            <div className="text-xs text-zinc-500 mb-1">Warning</div>
            <div className="text-lg font-bold text-yellow-400">
              {metrics.filter((m) => m.severity === "WARNING").length}
            </div>
          </div>
          <div className="rounded-lg bg-black/20 p-3 border border-white/5">
            <div className="text-xs text-zinc-500 mb-1">Critical</div>
            <div className="text-lg font-bold text-red-400">
              {metrics.filter((m) => m.severity === "CRITICAL").length}
            </div>
          </div>
        </div>
      </div>

      {/* Container Metrics Grid */}
      {metrics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Container Health
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence>
              {metrics.map((metric, index) => {
                const colors = getSeverityColor(metric.severity);
                return (
                  <motion.div
                    key={metric.containerName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server className={`h-4 w-4 ${colors.text}`} />
                        <span className="font-semibold text-white text-sm">
                          {metric.containerName}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {metric.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-zinc-500 mb-0.5">Docker</div>
                        <div
                          className={
                            metric.dockerHealthy
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {metric.dockerHealthy ? "✅ OK" : "❌ Down"}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-0.5">App</div>
                        <div
                          className={
                            metric.applicationHealthy
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {metric.applicationHealthy ? "✅ OK" : "❌ Fail"}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-0.5">CPU</div>
                        <div
                          className={
                            parseFloat(metric.cpuPercent) > 80
                              ? "text-red-400"
                              : "text-zinc-300"
                          }
                        >
                          {metric.cpuPercent}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-0.5">Memory</div>
                        <div
                          className={
                            parseFloat(metric.memPercent) > 80
                              ? "text-red-400"
                              : "text-zinc-300"
                          }
                        >
                          {metric.memPercent}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Recent Alerts
          </h4>
          <div className="space-y-1.5">
            <AnimatePresence>
              {alerts
                .slice()
                .reverse()
                .map((alert, index) => (
                  <motion.div
                    key={alert.timestamp + index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`rounded-lg p-3 border ${
                      alert.severity === "critical"
                        ? "bg-red-500/5 border-red-500/20"
                        : alert.severity === "warning"
                          ? "bg-yellow-500/5 border-yellow-500/20"
                          : "bg-blue-500/5 border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">
                          {alert.message}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
