/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Play,
  Pause,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
  X as CloseIcon,
  Cpu,
  MemoryStick,
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
  containerName?: string;
};

export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
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
  const [copiedLog, setCopiedLog] = useState<string | null>(null);

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
        const enrichedMetrics = data.result.containers.map((c: any) => ({
          containerName: c.containerName || c.name,
          dockerHealthy: c.dockerHealthy ?? c.status === "running",
          applicationHealthy: c.applicationHealthy ?? true,
          cpuPercent: c.cpuPercent || "0%",
          memPercent: c.memPercent || "0%",
          severity: c.severity || determineSeverity(c),
          timestamp: c.timestamp || new Date().toISOString(),
          httpHealthStatus: c.httpHealthStatus,
          issues: c.issues || [],
          logs: c.logs,
        }));

        setMetrics(enrichedMetrics);
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
          checkCount: data.checkNumber || stats.checkCount + 1,
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
      console.log("🔌 Disconnecting socket...");
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
    if (typeof Audio !== "undefined") {
      const audio = new Audio("/alert.mp3");
      audio.play().catch((e) => console.log("Audio play failed:", e));
    }
  };

  const handleStartMonitoring = async () => {
    try {
      console.log("🟢 Starting monitoring...");
      console.log("Session ID:", sessionId);
      console.log("Settings:", settings);

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
      console.log("Response:", data);

      if (data.success) {
        setIsMonitoring(true);
        setStartTime(Date.now());
        console.log("✅ Monitoring started successfully");
      } else {
        console.error("❌ Failed to start monitoring:", data.error);
        alert(`Failed to start monitoring: ${data.error}`);
      }
    } catch (error: any) {
      console.error("❌ Error starting monitoring:", error);
      alert(`Error: ${error.message}`);
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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLog(id);
      setTimeout(() => setCopiedLog(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:surface transition-colors"
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

              {/* Critical Containers */}
              {criticalContainers.length > 0 && (
                <ContainerSection
                  title="Critical Issues"
                  containers={criticalContainers}
                  severity="CRITICAL"
                  expandedContainer={expandedContainer}
                  setExpandedContainer={setExpandedContainer}
                  fixingContainer={fixingContainer}
                  aiFixProgress={aiFixProgress}
                  handleAIFix={handleAIFix}
                  copiedLog={copiedLog}
                  copyToClipboard={copyToClipboard}
                />
              )}

              {/* Warning Containers */}
              {warningContainers.length > 0 && (
                <ContainerSection
                  title="Warnings"
                  containers={warningContainers}
                  severity="WARNING"
                  expandedContainer={expandedContainer}
                  setExpandedContainer={setExpandedContainer}
                  fixingContainer={fixingContainer}
                  aiFixProgress={aiFixProgress}
                  handleAIFix={handleAIFix}
                  copiedLog={copiedLog}
                  copyToClipboard={copyToClipboard}
                />
              )}

              {/* Healthy Containers */}
              {healthyContainers.length > 0 && (
                <ContainerSection
                  title="Healthy Containers"
                  containers={healthyContainers}
                  severity="HEALTHY"
                  expandedContainer={expandedContainer}
                  setExpandedContainer={setExpandedContainer}
                  fixingContainer={fixingContainer}
                  aiFixProgress={aiFixProgress}
                  handleAIFix={handleAIFix}
                  copiedLog={copiedLog}
                  copyToClipboard={copyToClipboard}
                />
              )}

              {/* Alerts Section */}
              {showAlerts && alerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <h3 className="text-base font-bold text-[rgb(var(--foreground))] mb-4">
                    Recent Alerts
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {alerts
                      .slice(-10)
                      .reverse()
                      .map((alert, idx) => (
                        <AlertItem key={idx} alert={alert} />
                      ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Container Section Component
function ContainerSection({
  title,
  containers,
  severity,
  expandedContainer,
  setExpandedContainer,
  fixingContainer,
  aiFixProgress,
  handleAIFix,
  copiedLog,
  copyToClipboard,
}: {
  title: string;
  containers: ContainerMetric[];
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  expandedContainer: string | null;
  setExpandedContainer: (name: string | null) => void;
  fixingContainer: string | null;
  aiFixProgress: AIFixProgress | null;
  handleAIFix: (name: string) => void;
  copiedLog: string | null;
  copyToClipboard: (text: string, id: string) => void;
}) {
  const severityConfig = {
    CRITICAL: {
      icon: XCircle,
      color: "text-[rgb(var(--error))]",
      bg: "bg-[rgb(var(--error))]/10",
      border: "border-[rgb(var(--error))]/20",
    },
    WARNING: {
      icon: AlertTriangle,
      color: "text-[rgb(var(--warning))]",
      bg: "bg-[rgb(var(--warning))]/10",
      border: "border-[rgb(var(--warning))]/20",
    },
    HEALTHY: {
      icon: CheckCircle2,
      color: "text-[rgb(var(--success))]",
      bg: "bg-[rgb(var(--success))]/10",
      border: "border-[rgb(var(--success))]/20",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${config.border} surface-elevated p-6`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <h3 className="text-base font-bold text-[rgb(var(--foreground))]">
          {title}
          <span className="ml-2 text-sm font-normal text-[rgb(var(--foreground-muted))]">
            ({containers.length})
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {containers.map((container) => (
          <ContainerCard
            key={container.containerName}
            container={container}
            config={config}
            isExpanded={expandedContainer === container.containerName}
            onToggle={() =>
              setExpandedContainer(
                expandedContainer === container.containerName
                  ? null
                  : container.containerName,
              )
            }
            isFixing={fixingContainer === container.containerName}
            aiFixProgress={
              fixingContainer === container.containerName ? aiFixProgress : null
            }
            onFix={() => handleAIFix(container.containerName)}
            copiedLog={copiedLog}
            copyToClipboard={copyToClipboard}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Container Card Component
function ContainerCard({
  container,
  config,
  isExpanded,
  onToggle,
  isFixing,
  aiFixProgress,
  onFix,
  copiedLog,
  copyToClipboard,
}: {
  container: ContainerMetric;
  config: any;
  isExpanded: boolean;
  onToggle: () => void;
  isFixing: boolean;
  aiFixProgress: AIFixProgress | null;
  onFix: () => void;
  copiedLog: string | null;
  copyToClipboard: (text: string, id: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-all`}
    >
      {/* Container Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`p-2 rounded-lg ${config.bg} border ${config.border}`}
          >
            <Terminal className={`h-4 w-4 ${config.color}`} />
          </div>

          <div className="flex-1">
            <div className="font-medium text-[rgb(var(--foreground))]">
              {container.containerName}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--foreground-muted))]">
                <Cpu className="h-3 w-3" />
                <span>{container.cpuPercent}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--foreground-muted))]">
                <MemoryStick className="h-3 w-3" />
                <span>{container.memPercent}</span>
              </div>
              {container.httpHealthStatus?.checked && (
                <div className="flex items-center gap-1 text-xs text-[rgb(var(--foreground-muted))]">
                  {container.httpHealthStatus.healthy ? (
                    <Wifi className="h-3 w-3 text-[rgb(var(--success))]" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-[rgb(var(--error))]" />
                  )}
                  <span>
                    {container.httpHealthStatus.healthy ? "Online" : "Offline"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {container.severity === "CRITICAL" && (
            <button
              onClick={onFix}
              disabled={isFixing}
              className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  AI Fix
                </>
              )}
            </button>
          )}

          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:surface transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            )}
          </button>
        </div>
      </div>

      {/* Container Issues */}
      {container.issues && container.issues.length > 0 && (
        <div className="mt-3 space-y-1">
          {container.issues.map((issue, idx) => (
            <div
              key={idx}
              className="text-xs text-[rgb(var(--foreground-muted))] flex items-start gap-2"
            >
              <AlertCircle
                className={`h-3 w-3 mt-0.5 ${config.color} flex-shrink-0`}
              />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Fix Progress */}
      <AnimatePresence>
        {isFixing && aiFixProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 p-3 rounded-lg bg-[rgb(var(--primary))]/5 border border-[rgb(var(--primary))]/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-[rgb(var(--primary))]" />
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                AI Analysis
              </span>
            </div>

            {aiFixProgress.stage === "analyzing" && (
              <div className="text-xs text-[rgb(var(--foreground-muted))]">
                Analyzing container logs...
              </div>
            )}

            {aiFixProgress.stage === "analysis_complete" &&
              aiFixProgress.analysis && (
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="font-medium text-[rgb(var(--foreground))]">
                      Summary:
                    </span>{" "}
                    <span className="text-[rgb(var(--foreground-muted))]">
                      {aiFixProgress.analysis.summary}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-[rgb(var(--foreground))]">
                      Root Cause:
                    </span>{" "}
                    <span className="text-[rgb(var(--foreground-muted))]">
                      {aiFixProgress.analysis.rootCause}
                    </span>
                  </div>
                  {aiFixProgress.analysis.suggestedFixes.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium text-[rgb(var(--foreground))]">
                        Suggested Fixes:
                      </span>
                      <ul className="ml-4 mt-1 list-disc text-[rgb(var(--foreground-muted))]">
                        {aiFixProgress.analysis.suggestedFixes.map(
                          (fix, idx) => (
                            <li key={idx}>{fix}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            {aiFixProgress.stage === "applying_fix" && (
              <div className="text-xs text-[rgb(var(--foreground-muted))]">
                {aiFixProgress.message || "Applying fix..."}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-[rgb(var(--border))]"
          >
            {/* HTTP Health Status */}
            {container.httpHealthStatus?.checked && (
              <div className="mb-3 p-3 rounded-lg surface border border-[rgb(var(--border))]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-[rgb(var(--primary))]" />
                  <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                    HTTP Health Check
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[rgb(var(--foreground-muted))]">
                      Status:
                    </span>{" "}
                    <span
                      className={
                        container.httpHealthStatus.healthy
                          ? "text-[rgb(var(--success))]"
                          : "text-[rgb(var(--error))]"
                      }
                    >
                      {container.httpHealthStatus.healthy
                        ? "Healthy"
                        : "Unhealthy"}
                    </span>
                  </div>
                  {container.httpHealthStatus.statusCode && (
                    <div>
                      <span className="text-[rgb(var(--foreground-muted))]">
                        Status Code:
                      </span>{" "}
                      {container.httpHealthStatus.statusCode}
                    </div>
                  )}
                  {container.httpHealthStatus.responseTime && (
                    <div>
                      <span className="text-[rgb(var(--foreground-muted))]">
                        Response Time:
                      </span>{" "}
                      {container.httpHealthStatus.responseTime}ms
                    </div>
                  )}
                  {container.httpHealthStatus.checkedUrl && (
                    <div className="col-span-2">
                      <span className="text-[rgb(var(--foreground-muted))]">
                        URL:
                      </span>{" "}
                      <code className="text-xs bg-[rgb(var(--surface))] px-1 py-0.5 rounded">
                        {container.httpHealthStatus.checkedUrl}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Container Logs */}
            {container.logs && (
              <div className="p-3 rounded-lg surface border border-[rgb(var(--border))]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[rgb(var(--primary))]" />
                    <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                      Recent Logs
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(container.logs!, container.containerName)
                    }
                    className="p-1.5 rounded hover:surface transition-colors"
                  >
                    {copiedLog === container.containerName ? (
                      <Check className="h-3 w-3 text-[rgb(var(--success))]" />
                    ) : (
                      <Copy className="h-3 w-3 text-[rgb(var(--foreground-muted))]" />
                    )}
                  </button>
                </div>
                <pre className="text-xs text-[rgb(var(--foreground-muted))] bg-[rgb(var(--background))] p-3 rounded overflow-x-auto max-h-64 overflow-y-auto font-mono">
                  {container.logs.split("\n").slice(-50).join("\n")}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: MonitorAlert }) {
  const severityConfig = {
    info: {
      icon: CheckCircle2,
      color: "text-[rgb(var(--primary))]",
      bg: "bg-[rgb(var(--primary))]/10",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-[rgb(var(--warning))]",
      bg: "bg-[rgb(var(--warning))]/10",
    },
    critical: {
      icon: XCircle,
      color: "text-[rgb(var(--error))]",
      bg: "bg-[rgb(var(--error))]/10",
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div
      className={`p-3 rounded-lg ${config.bg} border border-[rgb(var(--border))]`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 ${config.color} flex-shrink-0`} />
        <div className="flex-1">
          <div className="text-sm text-[rgb(var(--foreground))]">
            {alert.message}
          </div>
          <div className="text-xs text-[rgb(var(--foreground-muted))] mt-1">
            {new Date(alert.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
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
