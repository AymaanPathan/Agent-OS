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
  Server,
  Clock,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Play,
  Pause,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Wifi,
  WifiOff,
  Terminal,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Brain,
  FileText,
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
  logs?: string; // Real container logs
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

type AIFixProgress = {
  stage: "analysis_complete" | "applying_fix";
  analysis?: {
    summary: string;
    rootCause: string;
    confidence: string;
    suggestedFixes: string[];
  };
  message?: string;
};

// ====================================
// 🎨 MAIN MONITOR DASHBOARD
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
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [expandedContainer, setExpandedContainer] = useState<string | null>(
    null,
  );
  const [fixingContainer, setFixingContainer] = useState<string | null>(null);
  const [aiFixProgress, setAiFixProgress] = useState<AIFixProgress | null>(
    null,
  );
  const [aiFixResult, setAiFixResult] = useState<any>(null);

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
      console.log("📊 Container data:", data.result?.containers);

      setStats((prev) => ({
        ...prev,
        checkCount: data.checkNumber || prev.checkCount + 1,
        lastCheckTime: data.timestamp,
      }));
      console.log("Data", data.result?.containers);
      // Process container data WITH LOGS
      if (data.result?.containers) {
        const containerMetrics = data.result.containers.map((c: any) => {
          console.log(
            `📦 Raw container data for ${c.name || c.containerName}:`,
            c,
          );

          const containerName = c.name || c.containerName;

          // 🔥 FIX: Comprehensive Docker health check
          const isDockerHealthy =
            c?.containerRunning === true ||
            c?.status?.toLowerCase() === "running" ||
            c?.Status?.toLowerCase() === "running" ||
            c?.State?.toLowerCase() === "running" ||
            c?.applicationHealthy === true; // Logical fallback

          const isAppHealthy = c?.applicationHealthy !== false;

          const severity =
            !isDockerHealthy || !isAppHealthy
              ? "CRITICAL"
              : parseFloat(c.cpuPercent || "0") > 80 ||
                  parseFloat(c.memPercent || "0") > 80
                ? "WARNING"
                : "HEALTHY";

          // Build detailed issues array from logs
          const issues: string[] = [];

          if (!isAppHealthy) {
            // Extract error info from logs if available
            if (c.logs && typeof c.logs === "string") {
              const logLines = c.logs
                .split("\n")
                .filter((line: any) => line.trim());
              const errorLines = logLines
                .filter(
                  (line: string) =>
                    line.toLowerCase().includes("error") ||
                    line.toLowerCase().includes("fail") ||
                    line.toLowerCase().includes("exception") ||
                    line.toLowerCase().includes("fatal"),
                )
                .slice(0, 5);

              if (errorLines.length > 0) {
                issues.push("Application errors detected:");
                errorLines.forEach((line: string) => {
                  issues.push(`${line.trim()}`);
                });
              } else {
                issues.push(
                  "Application health check failed (no specific errors in logs)",
                );
              }
            } else {
              issues.push("Application health check failed (logs unavailable)");
            }
          }

          if (parseFloat(c.cpuPercent || "0") > 80)
            issues.push(`High CPU usage: ${c.cpuPercent}`);
          if (parseFloat(c.memPercent || "0") > 80)
            issues.push(`High memory usage: ${c.memPercent}`);

          return {
            containerName,
            dockerHealthy: isDockerHealthy,
            applicationHealthy: isAppHealthy,
            cpuPercent: c.cpuPercent || "0%",
            memPercent: c.memPercent || "0%",
            severity,
            timestamp: data.timestamp,
            httpHealthStatus: c.httpHealthStatus,
            issues: issues.length > 0 ? issues : undefined,
            logs: c.logs || "No logs available",
          };
        });

        console.log("📊 Processed metrics:", containerMetrics);
        setMetrics(containerMetrics);

        // Auto-expand first unhealthy container if none is expanded
        if (!expandedContainer) {
          const firstUnhealthy = containerMetrics.find(
            (m: ContainerMetric) => m.severity !== "HEALTHY",
          );
          if (firstUnhealthy) {
            setExpandedContainer(firstUnhealthy.containerName);
            console.log(`🔍 Auto-expanding: ${firstUnhealthy.containerName}`);
          }
        }

        // Update stats
        const healthy = containerMetrics.filter(
          (m: ContainerMetric) => m.severity === "HEALTHY",
        ).length;
        const warning = containerMetrics.filter(
          (m: ContainerMetric) => m.severity === "WARNING",
        ).length;
        const critical = containerMetrics.filter(
          (m: ContainerMetric) => m.severity === "CRITICAL",
        ).length;

        setStats((prev) => ({
          ...prev,
          totalContainers: containerMetrics.length,
          healthyCount: healthy,
          warningCount: warning,
          criticalCount: critical,
        }));
      }
    });

    // Alert received
    socket.on("monitor_alert", (alert: MonitorAlert) => {
      console.log("🚨 Monitor alert:", alert);

      setAlerts((prev) => {
        const newAlerts = [...prev, alert].slice(-20);
        return newAlerts;
      });

      if (soundEnabled && alert.severity === "critical") {
        playAlertSound();
      }
    });

    // AI Fix Progress
    socket.on("ai_fix_progress", (data: any) => {
      console.log("🤖 AI Fix Progress:", data);
      setAiFixProgress(data);
    });

    // AI Fix Result
    socket.on("ai_fix_result", (result: any) => {
      console.log("🤖 AI Fix Result:", result);
      setFixingContainer(null);
      setAiFixProgress(null);
      setAiFixResult(result);

      // Add alert about the fix
      const alert: MonitorAlert = {
        timestamp: new Date().toISOString(),
        message: result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`,
        severity: result.success ? "info" : "critical",
        details: result,
      };
      setAlerts((prev) => [...prev, alert].slice(-20));

      // Clear result after 10 seconds
      setTimeout(() => setAiFixResult(null), 10000);
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
      socket.off("ai_fix_progress");
      socket.off("ai_fix_result");
      socket.off("monitor_stopped");
    };
  }, [socket, soundEnabled, expandedContainer]);
  console.log("stats ", stats);
  // Play alert sound
  const playAlertSound = () => {
    try {
      const audio = new Audio("/alert.mp3");
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (err) {
      console.error("Failed to play alert sound:", err);
    }
  };

  // Toggle pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    socket?.emit(isPaused ? "monitor_resume" : "monitor_pause", {
      runId,
      monitorId: "monitor-1",
    });
  };

  // AI Fix Container
  // Around line 142, find the handleAIFix function and replace it:

  const handleAIFix = async (containerName: string) => {
    // Validate container name
    if (
      !containerName ||
      containerName === "undefined" ||
      typeof containerName !== "string"
    ) {
      console.error("❌ [AI Fix] Invalid container name:", containerName);
      return;
    }

    console.log(`🤖 Initiating AI fix for: ${containerName}`);
    setFixingContainer(containerName);
    setAiFixProgress(null);
    setAiFixResult(null);

    // Emit AI fix request to backend
    socket?.emit("ai_fix_container", {
      runId,
      containerName,
    });
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Only show if monitoring is active OR has data
  if (!isMonitoring && metrics.length === 0) {
    return null;
  }

  // Separate containers by severity
  const criticalContainers = metrics.filter((m) => m.severity === "CRITICAL");
  const warningContainers = metrics.filter((m) => m.severity === "WARNING");
  const healthyContainers = metrics.filter((m) => m.severity === "HEALTHY");

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER WITH STATUS & CONTROLS
      ═══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                {isMonitoring && !isPaused ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="h-5 w-5 text-blue-400" />
                  </motion.div>
                ) : (
                  <Pause className="h-5 w-5 text-yellow-400" />
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
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Continuous Monitoring
                {isMonitoring && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                    {isPaused ? "PAUSED" : "ACTIVE"}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{formatUptime(stats.uptime)}</span>
                <span>•</span>
                <span>Check #{stats.checkCount}</span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`p-1.5 rounded-lg transition-colors ${
                showAlerts
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
              title={showAlerts ? "Hide alerts" : "Show alerts"}
            >
              {showAlerts ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg transition-colors ${
                soundEnabled
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
              title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
            >
              {soundEnabled ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={togglePause}
              className={`px-2.5 py-1.5 rounded-lg font-medium text-[10px] transition-colors ${
                isPaused
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              }`}
            >
              {isPaused ? (
                <div className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Resume
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Pause className="h-3 w-3" />
                  Pause
                </div>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COMPACT STATS ROW
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-2">
          <CompactStat
            label="Total"
            value={stats.totalContainers}
            color="text-zinc-400"
          />
          <CompactStat
            label="Healthy"
            value={stats.healthyCount}
            color="text-green-400"
          />
          <CompactStat
            label="Warning"
            value={stats.warningCount}
            color="text-yellow-400"
          />
          <CompactStat
            label="Critical"
            value={stats.criticalCount}
            color="text-red-400"
            pulse={stats.criticalCount > 0}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
          AI FIX PROGRESS BANNER
      ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {aiFixProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl border-2 border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-blue-950/30 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Brain className="h-5 w-5 text-purple-400" />
                </motion.div>
                <div>
                  <div className="font-semibold text-purple-200">
                    AI Auto-Recovery in Progress
                  </div>
                  <div className="text-xs text-purple-300/80 mt-0.5">
                    {aiFixProgress.message || "Analyzing logs..."}
                  </div>
                </div>
              </div>

              {aiFixProgress.analysis && (
                <div className="space-y-2 rounded-lg bg-black/20 p-3 border border-purple-500/20">
                  <div className="text-xs text-purple-200 font-semibold">
                    AI Analysis Complete
                  </div>
                  <div className="text-xs text-purple-300">
                    <span className="font-medium">Summary:</span>{" "}
                    {aiFixProgress.analysis.summary}
                  </div>
                  <div className="text-xs text-purple-300">
                    <span className="font-medium">Root Cause:</span>{" "}
                    {aiFixProgress.analysis.rootCause}
                  </div>
                  <div className="text-xs text-purple-300">
                    <span className="font-medium">Confidence:</span>{" "}
                    <span
                      className={
                        aiFixProgress.analysis.confidence === "high"
                          ? "text-green-400"
                          : aiFixProgress.analysis.confidence === "medium"
                            ? "text-yellow-400"
                            : "text-red-400"
                      }
                    >
                      {aiFixProgress.analysis.confidence.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          CONTAINER ISSUES (CRITICAL & WARNING ONLY)
      ═══════════════════════════════════════════════════════════════ */}
      {(criticalContainers.length > 0 || warningContainers.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Issues Detected (
            {criticalContainers.length + warningContainers.length})
          </h4>

          <div className="space-y-1.5">
            {/* Critical Containers */}
            {criticalContainers.map((metric, index) => (
              <ContainerIssueCard
                key={index}
                metric={metric}
                index={index}
                isExpanded={expandedContainer === metric.containerName}
                onToggle={() =>
                  setExpandedContainer(
                    expandedContainer === metric.containerName
                      ? null
                      : metric.containerName,
                  )
                }
                onAIFix={handleAIFix}
                isFixing={fixingContainer === metric.containerName}
              />
            ))}

            {/* Warning Containers */}
            {warningContainers.map((metric, index) => (
              <ContainerIssueCard
                key={metric.containerName}
                metric={metric}
                index={index + criticalContainers.length}
                isExpanded={expandedContainer === metric.containerName}
                onToggle={() =>
                  setExpandedContainer(
                    expandedContainer === metric.containerName
                      ? null
                      : metric.containerName,
                  )
                }
                onAIFix={handleAIFix}
                isFixing={fixingContainer === metric.containerName}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HEALTHY CONTAINERS (COLLAPSED BY DEFAULT)
      ═══════════════════════════════════════════════════════════════ */}
      {healthyContainers.length > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">
              {healthyContainers.length} Healthy Container
              {healthyContainers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {healthyContainers.map((c) => c.containerName).join(", ")}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RECENT ALERTS (ONLY IF ENABLED)
      ═══════════════════════════════════════════════════════════════ */}
      {showAlerts && alerts.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" />
              Recent Alerts ({alerts.length})
            </h4>
            <button
              onClick={() => setAlerts([])}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {alerts
              .slice()
              .reverse()
              .map((alert, index) => (
                <AlertCard key={alert.timestamp + index} alert={alert} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================
// 📊 COMPACT STAT COMPONENT
// ====================================

function CompactStat({
  label,
  value,
  color,
  pulse = false,
}: {
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{label}</span>
        {pulse && value > 0 && (
          <motion.div
            className="w-1.5 h-1.5 bg-red-400 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ====================================
// 🐳 CONTAINER ISSUE CARD (WITH REAL LOGS & AI FIX)
// ====================================

function ContainerIssueCard({
  metric,
  index,
  isExpanded,
  onToggle,
  onAIFix,
  isFixing,
}: {
  metric: ContainerMetric;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAIFix: (containerName: string) => void;
  isFixing: boolean;
}) {
  const [copiedLogs, setCopiedLogs] = useState(false);
  console.log(`metrics `, metric);
  const getSeverityConfig = () => {
    switch (metric.severity) {
      case "CRITICAL":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          icon: XCircle,
        };
      case "WARNING":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          text: "text-yellow-400",
          icon: AlertTriangle,
        };
      default:
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          text: "text-green-400",
          icon: CheckCircle2,
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  const copyLogs = () => {
    if (metric.logs) {
      navigator.clipboard.writeText(metric.logs);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  // Always show logs section if container is unhealthy
  const hasLogs = metric.logs && metric.logs !== "No logs available";
  const shouldShowLogsSection = metric.severity !== "HEALTHY";

  console.log(`📋 Card for ${metric.containerName}:`, {
    hasLogs,
    logsLength: metric.logs?.length,
    shouldShowLogsSection,
    isExpanded,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-lg border-2 ${config.border} ${config.bg} overflow-hidden`}
    >
      {/* Header - ALWAYS CLICKABLE */}
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
            <span className="font-semibold text-white text-sm truncate">
              {metric.containerName}
            </span>
            {metric.issues && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 flex items-center gap-1">
                <FileText className="h-2.5 w-2.5" />
                {metric.issues.length} issue
                {metric.issues.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] font-bold ${config.text} uppercase`}>
              {metric.severity}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-600 transition-transform ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
          <div>
            <div className="text-zinc-500">Docker</div>
            <div
              className={
                metric?.httpHealthStatus?.healthy
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {metric?.httpHealthStatus?.healthy ? "✅ OK" : "❌ Down"}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">App</div>
            <div
              className={
                metric?.applicationHealthy ? "text-green-400" : "text-red-400"
              }
            >
              {metric?.applicationHealthy ? "✅ OK" : "❌ Fail"}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">CPU</div>
            <div
              className={
                parseFloat(metric?.cpuPercent) > 80
                  ? "text-yellow-400"
                  : "text-green-400"
              }
            >
              {metric?.cpuPercent}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Mem</div>
            <div
              className={
                parseFloat(metric?.memPercent) > 80
                  ? "text-yellow-400"
                  : "text-green-400"
              }
            >
              {metric?.memPercent}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Details - WITH LOGS ALWAYS VISIBLE */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Issues List */}
              {metric?.issues && metric?.issues?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Detected Issues
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-md bg-black/20 p-2 border border-red-500/20">
                    {metric?.issues?.map((issue, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-red-300 font-mono leading-relaxed"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* HTTP Health */}
              {metric?.httpHealthStatus && (
                <div className="rounded-md bg-white/5 p-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {metric?.httpHealthStatus?.healthy ? (
                      <Wifi className="h-3 w-3 text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-400" />
                    )}
                    <span className="font-medium">HTTP Health</span>
                  </div>
                  {metric?.httpHealthStatus?.checkedUrl && (
                    <div className="text-[10px] text-zinc-500">
                      <Globe className="h-2.5 w-2.5 inline mr-1" />
                      {metric?.httpHealthStatus?.checkedUrl}
                    </div>
                  )}
                  {metric?.httpHealthStatus?.statusCode && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-zinc-500">Status:</span>
                      <span
                        className={
                          metric?.httpHealthStatus?.statusCode >= 200 &&
                          metric?.httpHealthStatus?.statusCode < 300
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {metric?.httpHealthStatus?.statusCode}
                      </span>
                      {metric?.httpHealthStatus?.responseTime && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">
                            {metric?.httpHealthStatus?.responseTime}ms
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Container Logs - ALWAYS SHOW IF AVAILABLE */}
              {shouldShowLogsSection && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Container Logs (Last 100 lines)
                    </div>
                    {hasLogs && (
                      <button
                        onClick={copyLogs}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        {copiedLogs ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="rounded-md bg-black/60 border border-zinc-800 p-3 max-h-64 overflow-y-auto">
                    {hasLogs ? (
                      <pre className="text-[9px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {metric?.logs}
                      </pre>
                    ) : (
                      <div className="text-xs text-zinc-500 italic text-center py-4">
                        No logs available for this container
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  console.log(
                    `🤖 [AI Fix Button] Clicked for container:`,
                    metric?.containerName,
                  );
                  if (!metric?.containerName) {
                    console.error(
                      "❌ [AI Fix Button] Container name is undefined!",
                    );
                    return;
                  }
                  onAIFix(metric?.containerName);
                }}
                disabled={isFixing}
                className={`w-full rounded-lg px-3 py-2.5 font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                  isFixing
                    ? "bg-blue-500/20 text-blue-400 cursor-wait"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                }`}
              >
                {isFixing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI is analyzing and fixing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Fix with AI Auto-Recovery
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ====================================
// 🚨 ALERT CARD COMPONENT
// ====================================

function AlertCard({ alert }: { alert: MonitorAlert }) {
  const getConfig = () => {
    switch (alert.severity) {
      case "critical":
        return {
          bg: "bg-red-500/5",
          border: "border-red-500/20",
          icon: <XCircle className="h-3 w-3 text-red-400" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-500/5",
          border: "border-yellow-500/20",
          icon: <AlertTriangle className="h-3 w-3 text-yellow-400" />,
        };
      default:
        return {
          bg: "bg-blue-500/5",
          border: "border-blue-500/20",
          icon: <CheckCircle2 className="h-3 w-3 text-blue-400" />,
        };
    }
  };

  const config = getConfig();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg p-2 border ${config.border} ${config.bg}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white">{alert.message}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
