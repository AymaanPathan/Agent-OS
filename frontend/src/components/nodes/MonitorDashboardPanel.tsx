/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/purity */
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
  Cpu,
  HardDrive,
  Eye,
  EyeOff,
  RefreshCw,
  Bell,
  BellOff,
  Play,
  Pause,
  BarChart3,
  AlertCircle,
  ChevronRight,
  Globe,
  Wifi,
  WifiOff,
} from "lucide-react";

// ====================================
// 🎯 TYPES
// ====================================

type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  timestamp: string;
  httpHealthStatus?: {
    checked: boolean;
    healthy: boolean;
    statusCode?: number;
    responseTime?: number;
    checkedUrl?: string;
  };
  issues?: string[];
};

type MonitorAlert = {
  timestamp: string;
  message: string;
  severity: "info" | "warning" | "critical";
  details: any;
};

type MonitorStats = {
  totalContainers: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  checkCount: number;
  lastCheckTime: string;
  uptime: number;
};

// ====================================
// 🎨 MONITOR DASHBOARD COMPONENT
// ====================================

export function MonitorDashboard({
  socket,
  runId,
}: {
  socket: any;
  runId: string;
}) {
  const [metrics, setMetrics] = useState<ContainerMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
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
  const [isPaused, setIsPaused] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(
    null,
  );
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Update uptime every second
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, startTime]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 [MonitorDashboard] Setting up socket listeners");

    // Monitor started
    socket.on("monitor_started", (data: any) => {
      console.log("🟢 Monitor started:", data);
      setIsMonitoring(true);
      setStartTime(Date.now());
    });

    // Check completed
    socket.on("monitor_check_completed", (data: any) => {
      console.log("📊 Monitor check completed:", data);

      setStats((prev) => ({
        ...prev,
        checkCount: data.checkNumber || prev.checkCount + 1,
        lastCheckTime: data.timestamp,
      }));

      // Process metrics from the check
      if (data.metrics && Array.isArray(data.metrics)) {
        const processedMetrics = data.metrics.map((m: any) => ({
          ...m,
          timestamp: data.timestamp,
        }));

        setMetrics(processedMetrics);

        // Update stats
        const healthy = processedMetrics.filter(
          (m: ContainerMetric) => m.severity === "HEALTHY",
        ).length;
        const warning = processedMetrics.filter(
          (m: ContainerMetric) => m.severity === "WARNING",
        ).length;
        const critical = processedMetrics.filter(
          (m: ContainerMetric) => m.severity === "CRITICAL",
        ).length;

        setStats((prev) => ({
          ...prev,
          totalContainers: processedMetrics.length,
          healthyCount: healthy,
          warningCount: warning,
          criticalCount: critical,
        }));
      }

      // Process container data if available
      if (data.result?.containers) {
        const containerMetrics = data.result.containers.map((c: any) => {
          const isDockerHealthy = c.status === "running";
          const isAppHealthy = c.applicationHealthy !== false;
          const severity =
            !isDockerHealthy || !isAppHealthy
              ? "CRITICAL"
              : parseFloat(c.cpuPercent || "0") > 80 ||
                  parseFloat(c.memPercent || "0") > 80
                ? "WARNING"
                : "HEALTHY";

          return {
            containerName: c.name,
            dockerHealthy: isDockerHealthy,
            applicationHealthy: isAppHealthy,
            cpuPercent: c.cpuPercent || "0%",
            memPercent: c.memPercent || "0%",
            severity,
            timestamp: data.timestamp,
            httpHealthStatus: c.httpHealthStatus,
          };
        });

        setMetrics(containerMetrics);
      }
    });

    // Alert received
    socket.on("monitor_alert", (alert: MonitorAlert) => {
      console.log("🚨 Monitor alert:", alert);

      setAlerts((prev) => {
        const newAlerts = [...prev, alert].slice(-20); // Keep last 20 alerts
        return newAlerts;
      });

      // Play sound for critical alerts
      if (soundEnabled && alert.severity === "critical") {
        playAlertSound();
      }
    });

    // Monitor stopped
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
  }, [socket, soundEnabled]);

  // Play alert sound
  const playAlertSound = () => {
    try {
      const audio = new Audio("/alert.mp3"); // Add an alert sound to your public folder
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (err) {
      console.error("Failed to play alert sound:", err);
    }
  };

  // Toggle pause/resume (placeholder - you'll need to implement backend support)
  const togglePause = () => {
    setIsPaused(!isPaused);
    // Emit socket event to backend if you add pause/resume functionality
    socket?.emit(isPaused ? "monitor_resume" : "monitor_pause", {
      runId,
      monitorId: "monitor-1",
    });
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Get severity styling
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "HEALTHY":
        return {
          bg: "bg-green-500/10",
          text: "text-green-400",
          border: "border-green-500/20",
          icon: CheckCircle2,
          label: "Healthy",
        };
      case "WARNING":
        return {
          bg: "bg-yellow-500/10",
          text: "text-yellow-400",
          border: "border-yellow-500/20",
          icon: AlertTriangle,
          label: "Warning",
        };
      case "CRITICAL":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
          icon: XCircle,
          label: "Critical",
        };
      default:
        return {
          bg: "bg-zinc-500/10",
          text: "text-zinc-400",
          border: "border-zinc-500/20",
          icon: Activity,
          label: "Unknown",
        };
    }
  };

  // Get alert icon
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-zinc-800 bg-zinc-900/50 p-8 text-center"
      >
        <Activity className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Waiting for Monitoring to Start
        </h3>
        <p className="text-sm text-zinc-500">
          The continuous monitoring will begin shortly
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER WITH STATUS & CONTROLS
      ═══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                {isMonitoring && !isPaused ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="h-6 w-6 text-blue-400" />
                  </motion.div>
                ) : (
                  <Pause className="h-6 w-6 text-yellow-400" />
                )}
              </div>
              {isMonitoring && !isPaused && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* Status Text */}
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Continuous Monitoring
                {isMonitoring && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                    {isPaused ? "PAUSED" : "ACTIVE"}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Uptime: {formatUptime(stats.uptime)}
                </span>
                <span>•</span>
                <span>Check #{stats.checkCount}</span>
                {stats.lastCheckTime && (
                  <>
                    <span>•</span>
                    <span>
                      Last: {new Date(stats.lastCheckTime).toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`p-2 rounded-lg transition-colors ${
                showAlerts
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
              title={showAlerts ? "Hide alerts" : "Show alerts"}
            >
              {showAlerts ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
              title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
            >
              {soundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={togglePause}
              className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                isPaused
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              }`}
            >
              {isPaused ? (
                <div className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </div>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            STATS GRID
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-3">
          <StatsCard
            icon={Server}
            label="Total"
            value={stats.totalContainers}
            color="text-zinc-400"
            bgColor="bg-zinc-500/10"
          />
          <StatsCard
            icon={CheckCircle2}
            label="Healthy"
            value={stats.healthyCount}
            color="text-green-400"
            bgColor="bg-green-500/10"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Warning"
            value={stats.warningCount}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
          />
          <StatsCard
            icon={XCircle}
            label="Critical"
            value={stats.criticalCount}
            color="text-red-400"
            bgColor="bg-red-500/10"
            pulse={stats.criticalCount > 0}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
          CONTAINER METRICS GRID
      ═══════════════════════════════════════════════════════════════ */}
      {metrics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Container Health ({metrics.length})
            </h4>
            <button
              onClick={() => setSelectedContainer(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {selectedContainer ? "Show all" : ""}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence mode="popLayout">
              {metrics
                .filter(
                  (m) =>
                    !selectedContainer || m.containerName === selectedContainer,
                )
                .map((metric, index) => (
                  <ContainerCard
                    key={metric.containerName}
                    metric={metric}
                    index={index}
                    isExpanded={metric.containerName === selectedContainer}
                    onToggle={() =>
                      setSelectedContainer(
                        selectedContainer === metric.containerName
                          ? null
                          : metric.containerName,
                      )
                    }
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RECENT ALERTS
      ═══════════════════════════════════════════════════════════════ */}
      {showAlerts && alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Recent Alerts ({alerts.length})
            </h4>
            <button
              onClick={() => setAlerts([])}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {alerts
                .slice()
                .reverse()
                .map((alert, index) => (
                  <AlertCard
                    key={alert.timestamp + index}
                    alert={alert}
                    index={index}
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================
// 📊 STATS CARD COMPONENT
// ====================================

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  pulse = false,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  pulse?: boolean;
}) {
  return (
    <div className={`rounded-lg ${bgColor} p-3 border border-white/5`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        {pulse && value > 0 && (
          <motion.div
            className="w-2 h-2 bg-red-400 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

// ====================================
// 🐳 CONTAINER CARD COMPONENT
// ====================================

function ContainerCard({
  metric,
  index,
  isExpanded,
  onToggle,
}: {
  metric: ContainerMetric;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = getSeverityConfig(metric.severity);
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-lg border-2 ${config.border} ${config.bg} overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.text}`} />
            <span className="font-semibold text-white text-sm">
              {metric.containerName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${config.text} uppercase`}>
              {config.label}
            </span>
            <ChevronRight
              className={`h-4 w-4 text-zinc-600 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <MetricBadge
            label="Docker"
            value={metric.dockerHealthy ? "✅ OK" : "❌ Down"}
            healthy={metric.dockerHealthy}
          />
          <MetricBadge
            label="App"
            value={metric.applicationHealthy ? "✅ OK" : "❌ Fail"}
            healthy={metric.applicationHealthy}
          />
          <MetricBadge
            label="CPU"
            value={metric.cpuPercent}
            healthy={parseFloat(metric.cpuPercent) <= 80}
          />
          <MetricBadge
            label="Memory"
            value={metric.memPercent}
            healthy={parseFloat(metric.memPercent) <= 80}
          />
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20 overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {/* HTTP Health Status */}
              {metric.httpHealthStatus && (
                <div className="rounded-md bg-white/5 p-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {metric.httpHealthStatus.healthy ? (
                      <Wifi className="h-3 w-3 text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-400" />
                    )}
                    <span className="font-medium">HTTP Health Check</span>
                  </div>
                  {metric.httpHealthStatus.checkedUrl && (
                    <div className="text-xs text-zinc-500">
                      <Globe className="h-3 w-3 inline mr-1" />
                      {metric.httpHealthStatus.checkedUrl}
                    </div>
                  )}
                  {metric.httpHealthStatus.statusCode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Status:</span>
                      <span
                        className={
                          metric.httpHealthStatus.statusCode >= 200 &&
                          metric.httpHealthStatus.statusCode < 300
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {metric.httpHealthStatus.statusCode}
                      </span>
                      {metric.httpHealthStatus.responseTime && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">
                            {metric.httpHealthStatus.responseTime}ms
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Issues */}
              {metric.issues && metric.issues.length > 0 && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
                  <div className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Issues ({metric.issues.length})
                  </div>
                  <ul className="space-y-0.5">
                    {metric.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-red-300">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-[10px] text-zinc-600">
                Last checked: {new Date(metric.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ====================================
// 🏷️ METRIC BADGE COMPONENT
// ====================================

function MetricBadge({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div>
      <div className="text-zinc-500 mb-0.5">{label}</div>
      <div className={healthy ? "text-green-400" : "text-red-400"}>{value}</div>
    </div>
  );
}

// ====================================
// 🚨 ALERT CARD COMPONENT
// ====================================

function AlertCard({ alert, index }: { alert: MonitorAlert; index: number }) {
  const getBgColor = () => {
    switch (alert.severity) {
      case "critical":
        return "bg-red-500/5 border-red-500/20";
      case "warning":
        return "bg-yellow-500/5 border-yellow-500/20";
      default:
        return "bg-blue-500/5 border-blue-500/20";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, x: -20 }}
      animate={{ opacity: 1, height: "auto", x: 0 }}
      exit={{ opacity: 0, height: 0, x: 20 }}
      transition={{ delay: index * 0.02 }}
      className={`rounded-lg p-3 border ${getBgColor()}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {alert.severity === "critical" ? (
            <XCircle className="h-4 w-4 text-red-400" />
          ) : alert.severity === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white mb-0.5">
            {alert.message}
          </div>
          <div className="text-[10px] text-zinc-500">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
          {alert.details && Object.keys(alert.details).length > 0 && (
            <div className="mt-1 text-[10px] text-zinc-600">
              {JSON.stringify(alert.details, null, 2)
                .split("\n")
                .slice(0, 3)
                .join("\n")}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Helper function for severity config
function getSeverityConfig(severity: string) {
  switch (severity) {
    case "HEALTHY":
      return {
        bg: "bg-green-500/10",
        text: "text-green-400",
        border: "border-green-500/20",
        icon: CheckCircle2,
        label: "Healthy",
      };
    case "WARNING":
      return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        border: "border-yellow-500/20",
        icon: AlertTriangle,
        label: "Warning",
      };
    case "CRITICAL":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/20",
        icon: XCircle,
        label: "Critical",
      };
    default:
      return {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        border: "border-zinc-500/20",
        icon: Activity,
        label: "Unknown",
      };
  }
}
