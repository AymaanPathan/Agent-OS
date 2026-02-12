/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Play,
  Pause,
  AlertCircle,
  ChevronDown,
  Terminal,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Brain,
  FileText,
  Wifi,
  WifiOff,
  Globe,
  Settings,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

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
  logs?: string;
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
  stage: "analyzing" | "analysis_complete" | "applying_fix";
  analysis?: {
    summary: string;
    rootCause: string;
    confidence: string;
    suggestedFixes: string[];
  };
  message?: string;
};

export default function MonitorPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
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
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        transports: ["websocket", "polling"],
      },
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
      newSocket.emit("join-monitor", sessionId);
    });

    newSocket.on("monitor-joined", (data) => {
      console.log("✅ Joined monitor session:", data);
    });

    // Listen for monitor events
    newSocket.on("monitor-check-completed", (data) => {
      console.log("📊 Check completed:", data);

      if (data.result?.containers) {
        const enrichedMetrics = data.result.containers.map((c: any) => ({
          containerName: c.name || c.containerName,
          dockerHealthy: c.status === "running",
          applicationHealthy: c.applicationHealthy ?? true,
          cpuPercent: c.cpuPercent || "0%",
          memPercent: c.memPercent || "0%",
          severity: determineSeverity(c),
          timestamp: new Date().toISOString(),
          httpHealthStatus: c.httpHealthStatus,
          issues: c.issues || [],
          logs: c.logs,
        }));

        setMetrics(enrichedMetrics);

        // Update stats
        setStats({
          totalContainers: enrichedMetrics.length,
          healthyCount: enrichedMetrics.filter(
            (m: ContainerMetric) => m.severity === "HEALTHY",
          ).length,
          warningCount: enrichedMetrics.filter(
            (m: ContainerMetric) => m.severity === "WARNING",
          ).length,
          criticalCount: enrichedMetrics.filter(
            (m: ContainerMetric) => m.severity === "CRITICAL",
          ).length,
          checkCount: data.checkNumber || 0,
          lastCheckTime: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
        });
      }
    });

    newSocket.on("monitor-alert", (alert) => {
      console.log("🚨 Alert:", alert);
      setAlerts((prev) => [...prev, alert].slice(-100));

      if (soundEnabled && alert.severity === "critical") {
        playAlertSound();
      }
    });

    newSocket.on("ai-fix-progress", (data) => {
      console.log("🤖 AI Fix Progress:", data);
      setAiFixProgress(data);
    });

    newSocket.on("ai-fix-result", (data) => {
      console.log("✅ AI Fix Result:", data);
      setFixingContainer(null);
      setAiFixProgress(null);

      // Add result as alert
      setAlerts((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: data.message || "AI fix completed",
          severity: data.success ? "info" : "critical",
          details: data,
        },
      ]);
    });

    return () => {
      newSocket.emit("leave-monitor", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId]);

  // Uptime counter
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

  const determineSeverity = (
    container: any,
  ): "HEALTHY" | "WARNING" | "CRITICAL" => {
    if (container.status !== "running") return "CRITICAL";
    if (container.applicationHealthy === false) return "CRITICAL";
    if (container.httpHealthStatus && !container.httpHealthStatus.healthy)
      return "CRITICAL";

    const cpu = parseFloat(container.cpuPercent) || 0;
    const mem = parseFloat(container.memPercent) || 0;

    if (cpu > 80 || mem > 80) return "WARNING";

    return "HEALTHY";
  };

  const playAlertSound = () => {
    // Play browser notification sound
    if (typeof Audio !== "undefined") {
      const audio = new Audio("/alert.mp3");
      audio.play().catch((e) => console.log("Audio play failed:", e));
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/monitor/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            config: settings,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setIsMonitoring(true);
        setStartTime(Date.now());
        console.log("✅ Monitoring started");
      } else {
        console.error("❌ Failed to start monitoring:", data.error);
      }
    } catch (error) {
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

  const handleAIFix = (containerName: string) => {
    if (!containerName || !socket) return;

    setFixingContainer(containerName);
    setAiFixProgress(null);

    socket.emit("ai-fix-container", { sessionId, containerName });
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const criticalContainers = metrics.filter((m) => m.severity === "CRITICAL");
  const warningContainers = metrics.filter((m) => m.severity === "WARNING");
  const healthyContainers = metrics.filter((m) => m.severity === "HEALTHY");

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
              className="p-2 rounded-lg hover:surface transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            </button>

            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--error))] hover:bg-[rgb(var(--error))]/90 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Stop Monitoring
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 rounded-lg surface border border-[rgb(var(--border))]"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--foreground))] mb-2">
                    Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.interval}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        interval: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm"
                    disabled={isMonitoring}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoFix"
                    checked={settings.autoFix}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoFix: e.target.checked,
                      }))
                    }
                    className="rounded"
                    disabled={isMonitoring}
                  />
                  <label
                    htmlFor="autoFix"
                    className="text-sm text-[rgb(var(--foreground))]"
                  >
                    Enable AI Auto-Fix
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="alertOnChange"
                    checked={settings.alertOnChange}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        alertOnChange: e.target.checked,
                      }))
                    }
                    className="rounded"
                    disabled={isMonitoring}
                  />
                  <label
                    htmlFor="alertOnChange"
                    className="text-sm text-[rgb(var(--foreground))]"
                  >
                    Alert on Changes
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
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
                <Play className="h-4 w-4" />
                Start Monitoring
              </button>
            </motion.div>
          ) : (
            <>
              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 flex items-center justify-center">
                        {!isPaused ? (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Activity className="h-5 w-5 text-[rgb(var(--primary))]" />
                          </motion.div>
                        ) : (
                          <Pause className="h-5 w-5 text-[rgb(var(--warning))]" />
                        )}
                      </div>
                      {!isPaused && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-[rgb(var(--success))] rounded-full border-2 border-[rgb(var(--surface-elevated))]"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
                        Monitoring Status
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--success))]/10 text-[rgb(var(--success))] font-medium border border-[rgb(var(--success))]/20">
                          {isPaused ? "PAUSED" : "ACTIVE"}
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--foreground-muted))] mt-1">
                        <span>{formatUptime(stats.uptime)}</span>
                        <span>•</span>
                        <span>Check #{stats.checkCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAlerts(!showAlerts)}
                      className={`p-2 rounded-lg transition-colors ${
                        showAlerts
                          ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                          : "surface text-[rgb(var(--foreground-muted))]"
                      }`}
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
                          ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                          : "surface text-[rgb(var(--foreground-muted))]"
                      }`}
                    >
                      {soundEnabled ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    label="Total"
                    value={stats.totalContainers}
                    color="text-[rgb(var(--foreground))]"
                    bg="surface"
                  />
                  <StatCard
                    label="Healthy"
                    value={stats.healthyCount}
                    color="text-[rgb(var(--success))]"
                    bg="bg-[rgb(var(--success))]/10"
                  />
                  <StatCard
                    label="Warning"
                    value={stats.warningCount}
                    color="text-[rgb(var(--warning))]"
                    bg="bg-[rgb(var(--warning))]/10"
                  />
                  <StatCard
                    label="Critical"
                    value={stats.criticalCount}
                    color="text-[rgb(var(--error))]"
                    bg="bg-[rgb(var(--error))]/10"
                    pulse={stats.criticalCount > 0}
                  />
                </div>
              </motion.div>

              {/* AI Fix Progress */}
              <AnimatePresence>
                {aiFixProgress && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rounded-xl border border-[rgb(var(--primary))]/20 bg-[rgb(var(--primary))]/5 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Brain className="h-5 w-5 text-[rgb(var(--primary))]" />
                        </motion.div>
                        <div>
                          <div className="font-semibold text-[rgb(var(--foreground))]">
                            AI Auto-Recovery in Progress
                          </div>
                          <div className="text-xs text-[rgb(var(--foreground-muted))] mt-0.5">
                            {aiFixProgress.message || "Analyzing logs..."}
                          </div>
                        </div>
                      </div>

                      {aiFixProgress.analysis && (
                        <div className="space-y-3 rounded-lg surface-elevated p-4 border border-[rgb(var(--border))]">
                          <div className="text-xs font-semibold text-[rgb(var(--foreground))]">
                            AI Analysis Complete
                          </div>
                          <div className="text-xs text-[rgb(var(--foreground-muted))]">
                            <span className="font-medium">Summary:</span>{" "}
                            {aiFixProgress.analysis.summary}
                          </div>
                          <div className="text-xs text-[rgb(var(--foreground-muted))]">
                            <span className="font-medium">Root Cause:</span>{" "}
                            {aiFixProgress.analysis.rootCause}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Container Issues */}
              {(criticalContainers.length > 0 ||
                warningContainers.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />
                    Issues Detected (
                    {criticalContainers.length + warningContainers.length})
                  </h4>

                  <div className="space-y-2">
                    {criticalContainers.map((metric, index) => (
                      <ContainerCard
                        key={metric.containerName}
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

                    {warningContainers.map((metric, index) => (
                      <ContainerCard
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

              {/* Healthy Containers */}
              {healthyContainers.length > 0 && (
                <div className="rounded-lg border border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-[rgb(var(--success))]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      {healthyContainers.length} Healthy Container
                      {healthyContainers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-xs text-[rgb(var(--foreground-muted))] mt-1">
                    {healthyContainers.map((c) => c.containerName).join(", ")}
                  </div>
                </div>
              )}

              {/* Recent Alerts */}
              {showAlerts && alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Recent Alerts ({alerts.length})
                    </h4>
                    <button
                      onClick={() => setAlerts([])}
                      className="text-xs text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {alerts
                      .slice()
                      .reverse()
                      .map((alert, index) => (
                        <AlertCard
                          key={alert.timestamp + index}
                          alert={alert}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  pulse = false,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  pulse?: boolean;
}) {
  return (
    <div className={`rounded-lg ${bg} border border-[rgb(var(--border))] p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[rgb(var(--foreground-muted))]">
          {label}
        </span>
        {pulse && value > 0 && (
          <motion.div
            className="w-2 h-2 bg-[rgb(var(--error))] rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ContainerCard({
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

  const getSeverityConfig = () => {
    switch (metric.severity) {
      case "CRITICAL":
        return {
          bg: "bg-[rgb(var(--error))]/10",
          border: "border-[rgb(var(--error))]/20",
          text: "text-[rgb(var(--error))]",
          icon: XCircle,
        };
      case "WARNING":
        return {
          bg: "bg-[rgb(var(--warning))]/10",
          border: "border-[rgb(var(--warning))]/20",
          text: "text-[rgb(var(--warning))]",
          icon: AlertTriangle,
        };
      default:
        return {
          bg: "bg-[rgb(var(--success))]/10",
          border: "border-[rgb(var(--success))]/20",
          text: "text-[rgb(var(--success))]",
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

  const hasLogs = metric.logs && metric.logs !== "No logs available";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:surface transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
            <span className="font-semibold text-[rgb(var(--foreground))] text-sm truncate">
              {metric.containerName}
            </span>
            {metric.issues && (
              <span className="text-[10px] px-2 py-0.5 rounded-full surface-elevated text-[rgb(var(--foreground-muted))] border border-[rgb(var(--border))] flex items-center gap-1">
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
              className={`h-4 w-4 text-[rgb(var(--foreground-subtle))] transition-transform ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
          <div>
            <div className="text-[rgb(var(--foreground-muted))] mb-0.5">
              Docker
            </div>
            <div
              className={
                metric.dockerHealthy
                  ? "text-[rgb(var(--success))]"
                  : "text-[rgb(var(--error))]"
              }
            >
              {metric.dockerHealthy ? "✓ OK" : "✗ Down"}
            </div>
          </div>
          <div>
            <div className="text-[rgb(var(--foreground-muted))] mb-0.5">
              App
            </div>
            <div
              className={
                metric.applicationHealthy
                  ? "text-[rgb(var(--success))]"
                  : "text-[rgb(var(--error))]"
              }
            >
              {metric.applicationHealthy ? "✓ OK" : "✗ Fail"}
            </div>
          </div>
          <div>
            <div className="text-[rgb(var(--foreground-muted))] mb-0.5">
              CPU
            </div>
            <div
              className={
                parseFloat(metric.cpuPercent) > 80
                  ? "text-[rgb(var(--warning))]"
                  : "text-[rgb(var(--success))]"
              }
            >
              {metric.cpuPercent}
            </div>
          </div>
          <div>
            <div className="text-[rgb(var(--foreground-muted))] mb-0.5">
              Memory
            </div>
            <div
              className={
                parseFloat(metric.memPercent) > 80
                  ? "text-[rgb(var(--warning))]"
                  : "text-[rgb(var(--success))]"
              }
            >
              {metric.memPercent}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[rgb(var(--border))] surface-elevated overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {metric.issues && metric.issues.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[rgb(var(--foreground))] mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Detected Issues
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg bg-[rgb(var(--error))]/5 p-3 border border-[rgb(var(--error))]/20">
                    {metric.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="text-xs text-[rgb(var(--error))] font-mono leading-relaxed"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metric.httpHealthStatus && (
                <div className="rounded-lg surface p-3 space-y-2 border border-[rgb(var(--border))]">
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--foreground))]">
                    {metric.httpHealthStatus.healthy ? (
                      <Wifi className="h-3 w-3 text-[rgb(var(--success))]" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-[rgb(var(--error))]" />
                    )}
                    <span className="font-medium">HTTP Health Check</span>
                  </div>
                  {metric.httpHealthStatus.checkedUrl && (
                    <div className="text-xs text-[rgb(var(--foreground-muted))]">
                      <Globe className="h-2.5 w-2.5 inline mr-1" />
                      {metric.httpHealthStatus.checkedUrl}
                    </div>
                  )}
                  {metric.httpHealthStatus.statusCode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[rgb(var(--foreground-muted))]">
                        Status:
                      </span>
                      <span
                        className={
                          metric.httpHealthStatus.statusCode >= 200 &&
                          metric.httpHealthStatus.statusCode < 300
                            ? "text-[rgb(var(--success))]"
                            : "text-[rgb(var(--error))]"
                        }
                      >
                        {metric.httpHealthStatus.statusCode}
                      </span>
                      {metric.httpHealthStatus.responseTime && (
                        <>
                          <span className="text-[rgb(var(--foreground-subtle))]">
                            •
                          </span>
                          <span className="text-[rgb(var(--foreground-muted))]">
                            {metric.httpHealthStatus.responseTime}ms
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasLogs && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Container Logs
                    </div>
                    <button
                      onClick={copyLogs}
                      className="text-xs px-2 py-1 rounded-lg surface hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))] transition-colors flex items-center gap-1"
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
                  </div>
                  <div className="rounded-lg bg-[#1a1a1a] border border-[rgb(var(--border))] p-3 max-h-64 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {metric.logs}
                    </pre>
                  </div>
                </div>
              )}

              <button
                onClick={() => onAIFix(metric.containerName)}
                disabled={isFixing}
                className={`w-full rounded-lg px-4 py-3 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isFixing
                    ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] cursor-wait"
                    : "bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] shadow-sm hover:shadow-md"
                }`}
              >
                {isFixing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is analyzing and fixing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
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

function AlertCard({ alert }: { alert: MonitorAlert }) {
  const getConfig = () => {
    switch (alert.severity) {
      case "critical":
        return {
          bg: "bg-[rgb(var(--error))]/10",
          border: "border-[rgb(var(--error))]/20",
          icon: <XCircle className="h-3 w-3 text-[rgb(var(--error))]" />,
        };
      case "warning":
        return {
          bg: "bg-[rgb(var(--warning))]/10",
          border: "border-[rgb(var(--warning))]/20",
          icon: (
            <AlertTriangle className="h-3 w-3 text-[rgb(var(--warning))]" />
          ),
        };
      default:
        return {
          bg: "bg-[rgb(var(--primary))]/10",
          border: "border-[rgb(var(--primary))]/20",
          icon: <CheckCircle2 className="h-3 w-3 text-[rgb(var(--primary))]" />,
        };
    }
  };

  const config = getConfig();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg p-3 border ${config.border} ${config.bg}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[rgb(var(--foreground))]">
            {alert.message}
          </div>
          <div className="text-[10px] text-[rgb(var(--foreground-muted))] mt-0.5">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
