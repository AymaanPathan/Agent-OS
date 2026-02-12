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
  RefreshCw,
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
  stage: "analysis_complete" | "applying_fix";
  analysis?: {
    summary: string;
    rootCause: string;
    confidence: string;
    suggestedFixes: string[];
  };
  message?: string;
};

export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [metrics] = useState<ContainerMetric[]>([]);
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

  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

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

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setStartTime(Date.now());
    socket?.emit("start_monitor");
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    socket?.emit("stop_monitor");
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    socket?.emit(isPaused ? "monitor_resume" : "monitor_pause");
  };

  const handleAIFix = async (containerName: string) => {
    if (!containerName) return;
    setFixingContainer(containerName);
    setAiFixProgress(null);
    socket?.emit("ai_fix_container", { containerName });
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
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>

              <div>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Container Monitoring
                </div>
                <div className="text-xs text-gray-500">
                  Real-time monitoring with AI auto-healing
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Stop Monitoring
              </button>
            )}
          </div>
        </div>
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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-gray-200 dark:border-gray-800 mb-6">
                <Activity className="h-10 w-10 text-blue-600 dark:text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Start Container Monitoring
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Monitor your Docker containers in real-time with AI-powered
                auto-healing capabilities
              </p>
              <button
                onClick={handleStartMonitoring}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2 mx-auto"
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
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                        {!isPaused ? (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                          </motion.div>
                        ) : (
                          <Pause className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                        )}
                      </div>
                      {!isPaused && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        Monitoring Status
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium border border-green-200 dark:border-green-800">
                          {isPaused ? "PAUSED" : "ACTIVE"}
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-500"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
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
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-500"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {soundEnabled ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={togglePause}
                      className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-1 ${
                        isPaused
                          ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                          : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      }`}
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-3 w-3" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" />
                          Pause
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    label="Total"
                    value={stats.totalContainers}
                    color="text-gray-700 dark:text-gray-300"
                    bg="bg-gray-50 dark:bg-gray-800"
                  />
                  <StatCard
                    label="Healthy"
                    value={stats.healthyCount}
                    color="text-green-700 dark:text-green-400"
                    bg="bg-green-50 dark:bg-green-950/30"
                  />
                  <StatCard
                    label="Warning"
                    value={stats.warningCount}
                    color="text-amber-700 dark:text-amber-400"
                    bg="bg-amber-50 dark:bg-amber-950/30"
                  />
                  <StatCard
                    label="Critical"
                    value={stats.criticalCount}
                    color="text-red-700 dark:text-red-400"
                    bg="bg-red-50 dark:bg-red-950/30"
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
                    className="rounded-xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 overflow-hidden"
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
                          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </motion.div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            AI Auto-Recovery in Progress
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {aiFixProgress.message || "Analyzing logs..."}
                          </div>
                        </div>
                      </div>

                      {aiFixProgress.analysis && (
                        <div className="space-y-3 rounded-lg bg-white dark:bg-gray-900 p-4 border border-purple-100 dark:border-purple-900">
                          <div className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                            AI Analysis Complete
                          </div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Summary:</span>{" "}
                            {aiFixProgress.analysis.summary}
                          </div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
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
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    Issues Detected (
                    {criticalContainers.length + warningContainers.length})
                  </h4>

                  <div className="space-y-2">
                    {criticalContainers.map((metric, index) => (
                      <ContainerCard
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
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      {healthyContainers.length} Healthy Container
                      {healthyContainers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {healthyContainers.map((c) => c.containerName).join(", ")}
                  </div>
                </div>
              )}

              {/* Recent Alerts */}
              {showAlerts && alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Recent Alerts ({alerts.length})
                    </h4>
                    <button
                      onClick={() => setAlerts([])}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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
    <div
      className={`rounded-lg ${bg} border border-gray-200 dark:border-gray-700 p-3`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {label}
        </span>
        {pulse && value > 0 && (
          <motion.div
            className="w-2 h-2 bg-red-500 rounded-full"
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
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-200 dark:border-red-800",
          text: "text-red-700 dark:text-red-400",
          icon: XCircle,
        };
      case "WARNING":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          icon: AlertTriangle,
        };
      default:
        return {
          bg: "bg-green-50 dark:bg-green-950/30",
          border: "border-green-200 dark:border-green-800",
          text: "text-green-700 dark:text-green-400",
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
        className="w-full p-4 text-left hover:bg-white/50 dark:hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
              {metric.containerName}
            </span>
            {metric.issues && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 flex items-center gap-1">
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
              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
          <div>
            <div className="text-gray-500 mb-0.5">Docker</div>
            <div
              className={
                metric.httpHealthStatus?.healthy
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {metric.httpHealthStatus?.healthy ? "✓ OK" : "✗ Down"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">App</div>
            <div
              className={
                metric.applicationHealthy
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {metric.applicationHealthy ? "✓ OK" : "✗ Fail"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">CPU</div>
            <div
              className={
                parseFloat(metric.cpuPercent) > 80
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
              }
            >
              {metric.cpuPercent}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Memory</div>
            <div
              className={
                parseFloat(metric.memPercent) > 80
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
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
            className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {metric.issues && metric.issues.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Detected Issues
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg bg-red-50 dark:bg-red-950/20 p-3 border border-red-100 dark:border-red-900">
                    {metric.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="text-xs text-red-700 dark:text-red-300 font-mono leading-relaxed"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metric.httpHealthStatus && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    {metric.httpHealthStatus.healthy ? (
                      <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                    )}
                    <span className="font-medium">HTTP Health Check</span>
                  </div>
                  {metric.httpHealthStatus.checkedUrl && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <Globe className="h-2.5 w-2.5 inline mr-1" />
                      {metric.httpHealthStatus.checkedUrl}
                    </div>
                  )}
                  {metric.httpHealthStatus.statusCode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Status:</span>
                      <span
                        className={
                          metric.httpHealthStatus.statusCode >= 200 &&
                          metric.httpHealthStatus.statusCode < 300
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {metric.httpHealthStatus.statusCode}
                      </span>
                      {metric.httpHealthStatus.responseTime && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 dark:text-gray-400">
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
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Container Logs
                    </div>
                    <button
                      onClick={copyLogs}
                      className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center gap-1"
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
                  <div className="rounded-lg bg-gray-900 dark:bg-black border border-gray-700 dark:border-gray-800 p-3 max-h-64 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-gray-300 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
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
                    ? "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 cursor-wait"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm hover:shadow-md"
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
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-100 dark:border-red-900",
          icon: <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />,
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-100 dark:border-amber-900",
          icon: (
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          ),
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-100 dark:border-blue-900",
          icon: (
            <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          ),
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
          <div className="text-xs text-gray-900 dark:text-gray-100">
            {alert.message}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
