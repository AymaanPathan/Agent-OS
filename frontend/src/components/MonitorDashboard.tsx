/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Loader2,
  Brain,
  RotateCcw,
  X as CloseIcon,
  Cpu,
  MemoryStick,
  Network,
  HardDrive,
  Container as ContainerIcon,
  Search,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Terminal,
  Copy,
  Sparkles,
  Globe,
  Wifi,
  WifiOff,
  ArrowLeft,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

type ContainerInfo = {
  name: string;
  status: string;
  id: string;
  image: string;
};

type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  memUsage: string;
  memLimit: string;
  networkIn: string;
  networkOut: string;
  diskRead: string;
  diskWrite: string;
  restartCount: number;
  uptime: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  timestamp: string;
  status: string;
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

type AIAnalysis = {
  success: boolean;
  summary: string;
  rootCause: string;
  confidence: "high" | "medium" | "low";
  errorCategory: string;
  affectedServices: string[];
  suggestedFixes: string[];
  keyLogLines: string[];
};

export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [availableContainers, setAvailableContainers] = useState<
    ContainerInfo[]
  >([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(
    null,
  );
  const [currentMetric, setCurrentMetric] = useState<ContainerMetric | null>(
    null,
  );
  const [metricHistory, setMetricHistory] = useState<ContainerMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [analyzingContainer, setAnalyzingContainer] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartSuccess, setRestartSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [sessionId] = useState(
    () => `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join-monitor", sessionId);
    });

    newSocket.on("monitor-check-completed", (data) => {
      if (data.result?.containers && selectedContainer) {
        const containerData = data.result.containers.find(
          (c: any) => (c.name || c.containerName) === selectedContainer,
        );

        if (containerData) {
          const metric: ContainerMetric = {
            containerName: containerData.name || containerData.containerName,
            dockerHealthy: containerData.status === "running",
            applicationHealthy: containerData.applicationHealthy ?? true,
            cpuPercent: containerData.cpuPercent || "0%",
            memPercent: containerData.memPercent || "0%",
            memUsage: containerData.memUsage || "0B",
            memLimit: containerData.memLimit || "0B",
            networkIn: containerData.networkIn || "0B",
            networkOut: containerData.networkOut || "0B",
            diskRead: containerData.diskRead || "0B",
            diskWrite: containerData.diskWrite || "0B",
            restartCount: containerData.restartCount || 0,
            uptime: containerData.uptime || "0m",
            severity: determineSeverity(containerData),
            timestamp: new Date().toISOString(),
            status: containerData.status || "unknown",
            httpHealthStatus: containerData.httpHealthStatus,
            issues: containerData.issues || [],
            logs: containerData.logs,
          };

          setCurrentMetric(metric);
          setMetricHistory((prev) => [...prev.slice(-19), metric]);

          if (restartSuccess && metric.severity !== "HEALTHY") {
            setRestartSuccess(false);
          }
        }
      }
    });

    newSocket.on("ai-analysis-complete", (data) => {
      if (data.containerName === selectedContainer) {
        setAiAnalysis(data.analysis);
        setAnalyzingContainer(false);
      }
    });

    newSocket.on("ai-analysis-error", () => {
      setAnalyzingContainer(false);
    });

    newSocket.on("restart-approval-required", (data) => {
      if (data.containerName === selectedContainer) {
        newSocket.emit("restart-approval-response", {
          approvalId: data.approvalId,
          approved: true,
        });
      }
    });

    newSocket.on("container-restarting", (data) => {
      if (data.containerName === selectedContainer) {
        setIsRestarting(true);
      }
    });

    newSocket.on("restart-completed", (data) => {
      if (data.containerName === selectedContainer) {
        setIsRestarting(false);
        setRestartSuccess(data.success);
      }
    });

    newSocket.on("restart-error", (data) => {
      if (data.containerName === selectedContainer) {
        setIsRestarting(false);
      }
    });

    return () => {
      newSocket.emit("leave-monitor", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId, selectedContainer, restartSuccess]);

  useEffect(() => {
    loadContainers();
  }, []);

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

  const loadContainers = async () => {
    try {
      setIsLoadingContainers(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/monitor/containers`,
      );
      const data = await response.json();

      if (data.success) {
        setAvailableContainers(data.containers);
      }
    } catch (error) {
      console.error("Failed to load containers:", error);
    } finally {
      setIsLoadingContainers(false);
    }
  };

  const handleStartMonitoring = async () => {
    if (!selectedContainer) return;

    try {
      setIsStarting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/monitor/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            config: {
              interval: 10,
              autoFix: false,
              alertOnChange: true,
              targets: "containers",
              selectedContainers: [selectedContainer],
            },
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setIsMonitoring(true);
        setMetricHistory([]);
        setRestartSuccess(false);
      }
    } catch (error: any) {
      console.error("Failed to start monitoring:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/monitor/stop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setIsMonitoring(false);
        setCurrentMetric(null);
        setMetricHistory([]);
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  };

  const handleAIAnalyze = () => {
    if (!socket || !selectedContainer) return;
    setAnalyzingContainer(true);
    setAiAnalysis(null);
    socket.emit("ai-analyze-container", {
      sessionId,
      containerName: selectedContainer,
    });
  };

  const handleRestart = async () => {
    if (!socket || !selectedContainer) return;
    setIsRestarting(true);
    socket.emit("request-restart-approval", {
      sessionId,
      containerName: selectedContainer,
      reason: "Manual restart requested from dashboard",
    });
  };

  const handleBackToSelection = async () => {
    if (isMonitoring) {
      await handleStopMonitoring();
    }
    setSelectedContainer(null);
    setCurrentMetric(null);
    setMetricHistory([]);
    setAiAnalysis(null);
    setRestartSuccess(false);
  };

  const copyLogs = () => {
    if (currentMetric?.logs) {
      navigator.clipboard.writeText(currentMetric.logs);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  const filteredContainers = availableContainers.filter(
    (container) =>
      container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.image.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "bg-[rgb(var(--error))]/10",
          border: "border-[rgb(var(--error))]/20",
          text: "text-[rgb(var(--error))]",
          icon: XCircle,
          label: "Critical",
        };
      case "WARNING":
        return {
          bg: "bg-[rgb(var(--warning))]/10",
          border: "border-[rgb(var(--warning))]/20",
          text: "text-[rgb(var(--warning))]",
          icon: AlertTriangle,
          label: "Warning",
        };
      default:
        return {
          bg: "bg-[rgb(var(--success))]/10",
          border: "border-[rgb(var(--success))]/20",
          text: "text-[rgb(var(--success))]",
          icon: CheckCircle2,
          label: "Healthy",
        };
    }
  };

  const getMetricTrend = (
    metricKey: keyof ContainerMetric,
  ): "up" | "down" | "stable" => {
    if (metricHistory.length < 2) return "stable";

    const current = parseFloat(
      String(currentMetric?.[metricKey] || "0").replace("%", ""),
    );
    const previous = parseFloat(
      String(
        metricHistory[metricHistory.length - 2]?.[metricKey] || "0",
      ).replace("%", ""),
    );

    if (current > previous + 5) return "up";
    if (current < previous - 5) return "down";
    return "stable";
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedContainer && (
              <button
                onClick={handleBackToSelection}
                className="p-2 hover:bg-[rgb(var(--surface))] rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                <Activity className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <div className="text-base font-bold text-[rgb(var(--foreground))]">
                  {selectedContainer || "Container Monitor"}
                </div>
                <div className="text-xs text-[rgb(var(--foreground-muted))]">
                  {selectedContainer
                    ? isMonitoring
                      ? "Live monitoring active"
                      : "Ready to monitor"
                    : "Select a container to begin"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedContainer && !isMonitoring && (
              <button
                onClick={handleStartMonitoring}
                disabled={isStarting}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isStarting ? "Starting..." : "Start Monitor"}
              </button>
            )}

            {isMonitoring && (
              <button
                onClick={handleStopMonitoring}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--error))] hover:bg-[rgb(var(--error))]/90 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Stop Monitor
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-[rgb(var(--surface))] rounded-lg transition-colors"
            >
              <CloseIcon className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!selectedContainer ? (
          <ContainerSelectionView
            containers={filteredContainers}
            isLoading={isLoadingContainers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectContainer={setSelectedContainer}
          />
        ) : !isMonitoring ? (
          <ReadyToMonitorView containerName={selectedContainer} />
        ) : (
          <MonitoringDashboardView
            metric={currentMetric}
            restartSuccess={restartSuccess}
            onAIAnalyze={handleAIAnalyze}
            onRestart={handleRestart}
            analyzingContainer={analyzingContainer}
            isRestarting={isRestarting}
            aiAnalysis={aiAnalysis}
            getSeverityConfig={getSeverityConfig}
            getMetricTrend={getMetricTrend}
            copyLogs={copyLogs}
            copiedLogs={copiedLogs}
          />
        )}
      </div>
    </div>
  );
}

function ContainerSelectionView({
  containers,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectContainer,
}: any) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] mb-4">
          <ContainerIcon className="h-10 w-10 text-[rgb(var(--primary))]" />
        </div>
        <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
          Select Container to Monitor
        </h2>
        <p className="text-[rgb(var(--foreground-muted))]">
          Choose a container for real-time monitoring and health analysis
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgb(var(--foreground-muted))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search containers..."
            className="w-full pl-11 pr-4 py-3 text-sm rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-muted))]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--primary))]" />
        </div>
      ) : containers.length === 0 ? (
        <div className="text-center py-24">
          <ContainerIcon className="h-12 w-12 text-[rgb(var(--foreground-muted))] mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--foreground-muted))]">
            No containers found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {containers.map((container: ContainerInfo) => (
            <ContainerCard
              key={container.id}
              container={container}
              onSelect={() => onSelectContainer(container.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContainerCard({ container, onSelect }: any) {
  const isRunning = container.status.toLowerCase().includes("up");

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="p-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-elevated))] transition-all text-left"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))]">
          <ContainerIcon className="h-5 w-5 text-[rgb(var(--foreground))]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-[rgb(var(--foreground))] truncate">
              {container.name}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isRunning
                  ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                  : "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))]"
              }`}
            >
              {isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>
          <p className="text-xs text-[rgb(var(--foreground-muted))] truncate">
            {container.image}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function ReadyToMonitorView({ containerName }: any) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] mb-6">
          <Activity className="h-10 w-10 text-[rgb(var(--primary))]" />
        </div>
        <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
          Ready to Monitor
        </h2>
        <p className="text-[rgb(var(--foreground-muted))] mb-6">
          Click &quot;Start Monitor&quot; to begin real-time monitoring of{" "}
          <span className="font-mono font-medium">{containerName}</span>
        </p>
      </div>
    </div>
  );
}

function MonitoringDashboardView({
  metric,
  restartSuccess,
  onAIAnalyze,
  onRestart,
  analyzingContainer,
  isRestarting,
  aiAnalysis,
  getSeverityConfig,
  getMetricTrend,
  copyLogs,
  copiedLogs,
}: any) {
  if (!metric) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--primary))] mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--foreground-muted))]">
            Initializing monitoring...
          </p>
        </div>
      </div>
    );
  }

  const config = getSeverityConfig(
    restartSuccess ? "HEALTHY" : metric.severity,
  );
  const Icon = config.icon;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border ${config.border} ${config.bg} p-6`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-lg ${config.bg} border ${config.border}`}
            >
              <Icon className={`h-6 w-6 ${config.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-[rgb(var(--foreground))]">
                  {metric.containerName}
                </h3>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${config.text} ${config.bg} border ${config.border}`}
                >
                  {restartSuccess ? "HEALTHY" : config.label.toUpperCase()}
                </span>
              </div>
              {restartSuccess && (
                <p className="text-sm text-[rgb(var(--success))] mt-1">
                  ✓ Container is now healthy after restart
                </p>
              )}
              {!restartSuccess && metric.issues && metric.issues.length > 0 && (
                <p className="text-sm text-[rgb(var(--foreground-muted))] mt-1">
                  {metric.issues.length} issue
                  {metric.issues.length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAIAnalyze}
              disabled={analyzingContainer}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {analyzingContainer ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  AI Analyze
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              disabled={isRestarting}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--warning))]/10 hover:bg-[rgb(var(--warning))]/20 text-[rgb(var(--warning))] border border-[rgb(var(--warning))]/20 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isRestarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </>
              )}
            </button>
          </div>
        </div>

        {metric.issues && metric.issues.length > 0 && !restartSuccess && (
          <div className="rounded-lg bg-[rgb(var(--error))]/5 border border-[rgb(var(--error))]/20 p-4">
            <div className="text-xs font-bold text-[rgb(var(--foreground))] mb-2 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-[rgb(var(--error))]" />
              Detected Issues
            </div>
            <div className="space-y-1">
              {metric.issues.map((issue: string, i: number) => (
                <div
                  key={i}
                  className="text-xs text-[rgb(var(--error))] font-mono"
                >
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="CPU Usage"
          value={metric.cpuPercent}
          icon={Cpu}
          trend={getMetricTrend("cpuPercent")}
          warning={parseFloat(metric.cpuPercent) > 80}
        />
        <MetricCard
          label="Memory Usage"
          value={metric.memPercent}
          subtitle={`${metric.memUsage} / ${metric.memLimit}`}
          icon={MemoryStick}
          trend={getMetricTrend("memPercent")}
          warning={parseFloat(metric.memPercent) > 80}
        />
        <MetricCard
          label="Network I/O"
          value={`${metric.networkIn} / ${metric.networkOut}`}
          icon={Network}
          trend={getMetricTrend("networkIn")}
        />
        <MetricCard
          label="Disk I/O"
          value={`${metric.diskRead} / ${metric.diskWrite}`}
          icon={HardDrive}
          trend={getMetricTrend("diskRead")}
        />
      </div>

      {/* Container Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
          <h4 className="text-sm font-bold text-[rgb(var(--foreground))] mb-4">
            Container Status
          </h4>
          <div className="space-y-3">
            <StatusRow label="Docker Status">
              <span
                className={
                  metric.dockerHealthy
                    ? "text-[rgb(var(--success))]"
                    : "text-[rgb(var(--error))]"
                }
              >
                {metric.dockerHealthy ? "✓ Running" : "✗ Stopped"}
              </span>
            </StatusRow>
            <StatusRow label="Application Health">
              <span
                className={
                  metric.applicationHealthy
                    ? "text-[rgb(var(--success))]"
                    : "text-[rgb(var(--error))]"
                }
              >
                {metric.applicationHealthy ? "✓ Healthy" : "✗ Unhealthy"}
              </span>
            </StatusRow>
            <StatusRow label="Restart Count">
              <span
                className={
                  metric.restartCount > 5
                    ? "text-[rgb(var(--warning))]"
                    : "text-[rgb(var(--foreground))]"
                }
              >
                {metric.restartCount}
              </span>
            </StatusRow>
            <StatusRow label="Uptime">
              <span className="text-[rgb(var(--foreground))]">
                {metric.uptime}
              </span>
            </StatusRow>
          </div>
        </div>

        {metric.httpHealthStatus && (
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
            <h4 className="text-sm font-bold text-[rgb(var(--foreground))] mb-4 flex items-center gap-2">
              {metric.httpHealthStatus.healthy ? (
                <Wifi className="h-4 w-4 text-[rgb(var(--success))]" />
              ) : (
                <WifiOff className="h-4 w-4 text-[rgb(var(--error))]" />
              )}
              HTTP Health Check
            </h4>
            <div className="space-y-3">
              {metric.httpHealthStatus.checkedUrl && (
                <StatusRow label="URL">
                  <div className="flex items-center gap-1 text-xs">
                    <Globe className="h-3 w-3 text-[rgb(var(--foreground-muted))]" />
                    <span className="text-[rgb(var(--foreground))] font-mono">
                      {metric.httpHealthStatus.checkedUrl}
                    </span>
                  </div>
                </StatusRow>
              )}
              {metric.httpHealthStatus.statusCode && (
                <StatusRow label="Status Code">
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
                </StatusRow>
              )}
              {metric.httpHealthStatus.responseTime && (
                <StatusRow label="Response Time">
                  <span className="text-[rgb(var(--foreground))]">
                    {metric.httpHealthStatus.responseTime}ms
                  </span>
                </StatusRow>
              )}
            </div>
          </div>
        )}
      </div>

      {aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-[rgb(var(--primary))]/20 bg-[rgb(var(--primary))]/5 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[rgb(var(--primary))]" />
            <h4 className="text-base font-bold text-[rgb(var(--foreground))]">
              AI Analysis Results
            </h4>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                aiAnalysis.confidence === "high"
                  ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                  : aiAnalysis.confidence === "medium"
                    ? "bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]"
                    : "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))]"
              }`}
            >
              {aiAnalysis.confidence.toUpperCase()} CONFIDENCE
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-[rgb(var(--foreground-muted))] mb-1">
                Summary
              </div>
              <p className="text-sm text-[rgb(var(--foreground))]">
                {aiAnalysis.summary}
              </p>
            </div>

            <div>
              <div className="text-xs font-bold text-[rgb(var(--foreground-muted))] mb-1">
                Root Cause
              </div>
              <p className="text-sm text-[rgb(var(--foreground))]">
                {aiAnalysis.rootCause}
              </p>
            </div>

            {aiAnalysis.suggestedFixes &&
              aiAnalysis.suggestedFixes.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[rgb(var(--foreground-muted))] mb-2">
                    Suggested Fixes
                  </div>
                  <div className="space-y-2">
                    {aiAnalysis.suggestedFixes.map((fix: string, i: number) => (
                      <div
                        key={i}
                        className="text-sm text-[rgb(var(--foreground))] bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]"
                      >
                        {i + 1}. {fix}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </motion.div>
      )}

      {metric.logs && metric.logs !== "No logs available" && (
        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[rgb(var(--foreground))]" />
              <h4 className="text-sm font-bold text-[rgb(var(--foreground))]">
                Container Logs
              </h4>
            </div>
            <button
              onClick={copyLogs}
              className="text-xs px-3 py-1.5 rounded-lg bg-[rgb(var(--surface-elevated))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))] transition-colors flex items-center gap-1.5"
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
          <div className="rounded-lg bg-[#1a1a1a] border border-[rgb(var(--border))] p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
              {metric.logs}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  warning,
}: any) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-[rgb(var(--error))]" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-[rgb(var(--success))]" />;
      default:
        return (
          <Minus className="h-3 w-3 text-[rgb(var(--foreground-muted))]" />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border p-4 ${
        warning
          ? "border-[rgb(var(--warning))]/20 bg-[rgb(var(--warning))]/5"
          : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon
          className={`h-4 w-4 ${
            warning
              ? "text-[rgb(var(--warning))]"
              : "text-[rgb(var(--foreground-muted))]"
          }`}
        />
        {getTrendIcon()}
      </div>
      <div className="text-xs text-[rgb(var(--foreground-muted))] mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold ${
          warning
            ? "text-[rgb(var(--warning))]"
            : "text-[rgb(var(--foreground))]"
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-[rgb(var(--foreground-muted))] mt-1">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}

function StatusRow({ label, children }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[rgb(var(--foreground-muted))]">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
