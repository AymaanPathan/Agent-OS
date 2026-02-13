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
  Terminal,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Brain,
  Wifi,
  WifiOff,
  Globe,
  Settings,
  X as CloseIcon,
  Cpu,
  MemoryStick,
  Send,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Shield,
  Zap,
  MessageSquare,
  Hash,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

// ====================================
// 📊 TYPE DEFINITIONS
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

type AIAnalysis = {
  summary: string;
  rootCause: string;
  confidence: "high" | "medium" | "low";
  errorCategory: string;
  keyLogLines: string[];
  suggestedFixes: Array<{
    action: string;
    title: string;
    description: string;
    requiresApproval: boolean;
    severity: "low" | "medium" | "high" | "critical";
  }>;
};

type RestartApprovalRequest = {
  approvalId: string;
  containerName: string;
  reason: string;
  timestamp: string;
};

type SlackModalData = {
  containerName: string;
  metric: ContainerMetric;
};

// ====================================
// 🎨 MAIN COMPONENT
// ====================================

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
  const [showAlerts, setShowAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [expandedContainer, setExpandedContainer] = useState<string | null>(
    null,
  );
  const [fixingContainer, setFixingContainer] = useState<string | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, AIAnalysis>>({});
  const [restartApprovalRequest, setRestartApprovalRequest] =
    useState<RestartApprovalRequest | null>(null);
  const [slackModalData, setSlackModalData] = useState<SlackModalData | null>(
    null,
  );
  const [sessionId] = useState(
    () => `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    interval: 30,
    autoFix: false,
    alertOnChange: true,
  });

  // ====================================
  // 🔌 SOCKET CONNECTION
  // ====================================

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

    newSocket.on("ai-analysis-complete", (data) => {
      console.log("✅ AI Analysis Complete:", data);
      setAiAnalyses((prev) => ({
        ...prev,
        [data.containerName]: data.analysis,
      }));
      setFixingContainer(null);
    });

    // Restart approval flow
    newSocket.on(
      "restart-approval-required",
      (data: RestartApprovalRequest) => {
        console.log("🔐 Restart Approval Required:", data);
        setRestartApprovalRequest(data);
      },
    );

    newSocket.on("restart-completed", (data) => {
      console.log("✅ Restart completed:", data);
      setRestartApprovalRequest(null);

      setAlerts((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: data.message,
          severity: data.success ? "info" : "critical",
          details: data,
        },
      ]);
    });

    newSocket.on("restart-rejected", (data) => {
      console.log("❌ Restart rejected:", data);
      setRestartApprovalRequest(null);

      setAlerts((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: data.message,
          severity: "warning",
          details: data,
        },
      ]);
    });

    newSocket.on("slack-notification-sent", (data) => {
      console.log("✅ Slack notification sent:", data);
      setSlackModalData(null);

      setAlerts((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: `Slack notification sent to #${data.channel} for ${data.containerName}`,
          severity: "info",
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

  // ====================================
  // ⏱️ UPTIME COUNTER
  // ====================================

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

  // ====================================
  // 🎯 HELPER FUNCTIONS
  // ====================================

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

  // ====================================
  // 📡 API HANDLERS
  // ====================================

  const handleStartMonitoring = async () => {
    try {
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
        console.log("✅ Monitoring started");
      } else {
        console.error("❌ Failed to start monitoring:", data.error);
        alert(`Failed to start: ${data.error}`);
      }
    } catch (error: any) {
      console.error("❌ Error:", error);
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
      console.error("❌ Error stopping:", error);
    }
  };

  const handleAIAnalyze = async (containerName: string) => {
    if (!containerName || !socket) return;

    setFixingContainer(containerName);
    setAiAnalyses((prev) => {
      const newAnalyses = { ...prev };
      delete newAnalyses[containerName];
      return newAnalyses;
    });

    socket.emit("ai-analyze-container", { sessionId, containerName });
  };

  const handleRequestRestart = (containerName: string, reason: string) => {
    if (!socket) return;

    socket.emit("request-restart-approval", {
      sessionId,
      containerName,
      reason,
    });
  };

  const handleRestartApprovalResponse = (approved: boolean) => {
    if (!socket || !restartApprovalRequest) return;

    socket.emit("restart-approval-response", {
      approvalId: restartApprovalRequest.approvalId,
      approved,
    });
  };

  const handleOpenSlackModal = (containerName: string) => {
    const metric = metrics.find((m) => m.containerName === containerName);
    if (metric) {
      setSlackModalData({ containerName, metric });
    }
  };

  const handleSendSlackNotification = (channel: string, message: string) => {
    if (!socket || !slackModalData) return;

    socket.emit("send-slack-notification", {
      sessionId,
      containerName: slackModalData.containerName,
      channel,
      message,
      severity:
        slackModalData.metric.severity === "CRITICAL" ? "error" : "warning",
      metadata: {
        "Docker Healthy": slackModalData.metric.dockerHealthy ? "✅" : "❌",
        "App Healthy": slackModalData.metric.applicationHealthy ? "✅" : "❌",
        CPU: slackModalData.metric.cpuPercent,
        Memory: slackModalData.metric.memPercent,
      },
    });
  };

  const criticalContainers = metrics.filter((m) => m.severity === "CRITICAL");
  const warningContainers = metrics.filter((m) => m.severity === "WARNING");
  const healthyContainers = metrics.filter((m) => m.severity === "HEALTHY");

  // ====================================
  // 🎨 RENDER
  // ====================================

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      {/* Restart Approval Modal */}
      <AnimatePresence>
        {restartApprovalRequest && (
          <RestartApprovalModal
            request={restartApprovalRequest}
            onApprove={() => handleRestartApprovalResponse(true)}
            onReject={() => handleRestartApprovalResponse(false)}
            onClose={() => setRestartApprovalRequest(null)}
          />
        )}
      </AnimatePresence>

      {/* Slack Modal */}
      <AnimatePresence>
        {slackModalData && (
          <SlackNotificationModal
            data={slackModalData}
            onSend={handleSendSlackNotification}
            onClose={() => setSlackModalData(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <Header
        isMonitoring={isMonitoring}
        stats={stats}
        showSettings={showSettings}
        settings={settings}
        onClose={onClose}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onStartMonitoring={handleStartMonitoring}
        onStopMonitoring={handleStopMonitoring}
        onUpdateSettings={setSettings}
        showAlerts={showAlerts}
        soundEnabled={soundEnabled}
        onToggleAlerts={() => setShowAlerts(!showAlerts)}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {!isMonitoring ? (
            <EmptyState onStart={handleStartMonitoring} />
          ) : (
            <>
              <StatsOverview stats={stats} />

              {(criticalContainers.length > 0 ||
                warningContainers.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />
                    Issues Detected (
                    {criticalContainers.length + warningContainers.length})
                  </h4>

                  <div className="space-y-2">
                    {[...criticalContainers, ...warningContainers].map(
                      (metric, index) => (
                        <ContainerCard
                          key={metric.containerName}
                          metric={metric}
                          index={index}
                          isExpanded={
                            expandedContainer === metric.containerName
                          }
                          onToggle={() =>
                            setExpandedContainer(
                              expandedContainer === metric.containerName
                                ? null
                                : metric.containerName,
                            )
                          }
                          isAnalyzing={fixingContainer === metric.containerName}
                          analysis={aiAnalyses[metric.containerName]}
                          onAnalyze={handleAIAnalyze}
                          onRequestRestart={handleRequestRestart}
                          onSendToSlack={handleOpenSlackModal}
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

              {healthyContainers.length > 0 && (
                <HealthyContainersCard containers={healthyContainers} />
              )}

              {showAlerts && alerts.length > 0 && (
                <AlertsCard alerts={alerts} onClear={() => setAlerts([])} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================
// 🧩 RESTART APPROVAL MODAL
// ====================================

function RestartApprovalModal({
  request,
  onApprove,
  onReject,
  onClose,
}: {
  request: RestartApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[rgb(var(--surface-elevated))] rounded-xl border border-[rgb(var(--border))] p-6 max-w-lg w-full shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-lg bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20">
            <Shield className="h-6 w-6 text-[rgb(var(--warning))]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[rgb(var(--foreground))] mb-1">
              Container Restart Approval
            </h3>
            <p className="text-sm text-[rgb(var(--foreground-muted))]">
              This action will restart the container
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:surface rounded-lg transition-colors"
          >
            <CloseIcon className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-lg surface border border-[rgb(var(--border))]">
            <div className="flex items-center gap-3 mb-3">
              <RotateCcw className="h-5 w-5 text-[rgb(var(--primary))]" />
              <div>
                <div className="text-xs text-[rgb(var(--foreground-muted))] mb-1">
                  Container
                </div>
                <div className="font-mono font-semibold text-[rgb(var(--foreground))]">
                  {request.containerName}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[rgb(var(--border))]">
              <div className="text-xs text-[rgb(var(--foreground-muted))] mb-1">
                Reason
              </div>
              <div className="text-sm text-[rgb(var(--foreground))]">
                {request.reason}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-3 rounded-lg bg-[rgb(var(--error))]/10 hover:bg-[rgb(var(--error))]/20 text-[rgb(var(--error))] font-medium transition-colors flex items-center justify-center gap-2 border border-[rgb(var(--error))]/20"
          >
            <ThumbsDown className="h-4 w-4" />
            Reject Restart
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            Approve Restart
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ====================================
// 🧩 SLACK NOTIFICATION MODAL
// ====================================

function SlackNotificationModal({
  data,
  onSend,
  onClose,
}: {
  data: SlackModalData;
  onSend: (channel: string, message: string) => void;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState(
    `🚨 Container Alert: ${data.containerName}\n\nStatus: ${data.metric.severity}\nCPU: ${data.metric.cpuPercent}\nMemory: ${data.metric.memPercent}`,
  );

  const handleSend = () => {
    if (!channel.trim()) {
      alert("Please enter a Slack channel name");
      return;
    }
    onSend(channel, message);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[rgb(var(--surface-elevated))] rounded-xl border border-[rgb(var(--border))] p-6 max-w-lg w-full shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
            <MessageSquare className="h-6 w-6 text-[rgb(var(--primary))]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[rgb(var(--foreground))] mb-1">
              Send Slack Notification
            </h3>
            <p className="text-sm text-[rgb(var(--foreground-muted))]">
              Alert your team about this container issue
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:surface rounded-lg transition-colors"
          >
            <CloseIcon className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              Slack Channel
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--foreground-muted))]" />
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="general"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-[rgb(var(--foreground-muted))] mt-1">
              Enter channel name without #
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent resize-none font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg surface hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!channel.trim()}
            className="flex-1 px-4 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Send to Slack
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// (Continue with remaining components: Header, StatsOverview, ContainerCard, etc.)
// Due to length limits, I'll create a separate file for the remaining components
// ====================================
// REMAINING MONITOR DASHBOARD COMPONENTS
// Add these to the MonitorDashboard file
// ====================================

// ====================================
// 🧩 HEADER COMPONENT
// ====================================

function Header({
  isMonitoring,
  stats,
  showSettings,
  settings,
  onClose,
  onToggleSettings,
  onStartMonitoring,
  onStopMonitoring,
  onUpdateSettings,
  showAlerts,
  soundEnabled,
  onToggleAlerts,
  onToggleSound,
}: any) {
  return (
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
                Real-time monitoring with AI-powered analysis
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMonitoring && (
            <>
              <button
                onClick={onToggleAlerts}
                className={`p-2 rounded-lg transition-colors ${
                  showAlerts
                    ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                    : "surface text-[rgb(var(--foreground-muted))]"
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
                onClick={onToggleSound}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                    : "surface text-[rgb(var(--foreground-muted))]"
                }`}
                title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
              >
                {soundEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </button>
            </>
          )}

          <button
            onClick={onToggleSettings}
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
              onClick={onStartMonitoring}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={onStopMonitoring}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--error))] hover:bg-[rgb(var(--error))]/90 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Stop
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--foreground))] mb-2">
                  Check Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.interval}
                  onChange={(e) =>
                    onUpdateSettings((prev: any) => ({
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
                  id="alertOnChange"
                  checked={settings.alertOnChange}
                  onChange={(e) =>
                    onUpdateSettings((prev: any) => ({
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
  );
}

// ====================================
// 📊 STATS OVERVIEW
// ====================================

function StatsOverview({ stats }: { stats: MonitorStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
    >
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="Total"
          value={stats.totalContainers}
          icon={Activity}
          color="text-[rgb(var(--foreground))]"
          bg="surface"
        />
        <StatCard
          label="Healthy"
          value={stats.healthyCount}
          icon={CheckCircle2}
          color="text-[rgb(var(--success))]"
          bg="bg-[rgb(var(--success))]/10"
        />
        <StatCard
          label="Warning"
          value={stats.warningCount}
          icon={AlertTriangle}
          color="text-[rgb(var(--warning))]"
          bg="bg-[rgb(var(--warning))]/10"
        />
        <StatCard
          label="Critical"
          value={stats.criticalCount}
          icon={XCircle}
          color="text-[rgb(var(--error))]"
          bg="bg-[rgb(var(--error))]/10"
          pulse={stats.criticalCount > 0}
        />
        <div className="p-4 rounded-lg surface border border-[rgb(var(--border))]">
          <div className="text-xs text-[rgb(var(--foreground-muted))] mb-1">
            Check #{stats.checkCount}
          </div>
          <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
            {stats.uptime > 0
              ? `${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s`
              : "0s"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, pulse }: any) {
  return (
    <div className={`rounded-lg ${bg} border border-[rgb(var(--border))] p-4`}>
      <div className="flex items-center justify-between mb-2">
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
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

// ====================================
// 🏥 CONTAINER CARD
// ====================================

function ContainerCard({
  metric,
  index,
  isExpanded,
  onToggle,
  isAnalyzing,
  analysis,
  onAnalyze,
  onRequestRestart,
  onSendToSlack,
}: any) {
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className={`h-5 w-5 ${config.text} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-[rgb(var(--foreground))] truncate">
                {metric.containerName}
              </div>
              {metric.issues && metric.issues.length > 0 && (
                <div className="text-xs text-[rgb(var(--foreground-muted))] mt-1">
                  {metric.issues[0]}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="h-3 w-3" />
              <span className={metric.cpuPercent > "80%" ? config.text : ""}>
                {metric.cpuPercent}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <MemoryStick className="h-3 w-3" />
              <span className={metric.memPercent > "80%" ? config.text : ""}>
                {metric.memPercent}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[rgb(var(--foreground-subtle))] transition-transform ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />
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
              {/* Issues */}
              {metric.issues && metric.issues.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[rgb(var(--foreground))] mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Detected Issues
                  </div>
                  <div className="space-y-1 rounded-lg bg-[rgb(var(--error))]/5 p-3 border border-[rgb(var(--error))]/20">
                    {metric.issues.map((issue: string, i: number) => (
                      <div
                        key={i}
                        className="text-xs text-[rgb(var(--error))] font-mono leading-relaxed"
                      >
                        • {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Container Logs */}
              {metric.logs && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Container Logs
                    </div>
                    <button
                      onClick={copyLogs}
                      className="text-xs px-2 py-1 rounded-lg surface hover:bg-[rgb(var(--border))] transition-colors flex items-center gap-1"
                    >
                      {copiedLogs ? (
                        <>
                          <Check className="h-3 w-3 text-[rgb(var(--success))]" />
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

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!analysis && !isAnalyzing && (
                  <button
                    onClick={() => onAnalyze(metric.containerName)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Analyze with AI
                  </button>
                )}

                {isAnalyzing && (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[rgb(var(--primary))]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is analyzing...</span>
                  </div>
                )}

                <button
                  onClick={() =>
                    onRequestRestart(
                      metric.containerName,
                      "Container showing critical issues and requires restart",
                    )
                  }
                  className="px-4 py-2.5 rounded-lg border border-[rgb(var(--warning))]/30 bg-[rgb(var(--warning))]/10 hover:bg-[rgb(var(--warning))]/20 text-[rgb(var(--warning))] font-medium text-sm transition-all flex items-center gap-2"
                  title="Request Restart"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </button>

                <button
                  onClick={() => onSendToSlack(metric.containerName)}
                  className="px-4 py-2.5 rounded-lg border border-[rgb(var(--border))] surface hover:bg-[rgb(var(--border))] font-medium text-sm transition-all flex items-center gap-2"
                  title="Send to Slack"
                >
                  <Send className="h-4 w-4" />
                  Slack
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ====================================
// 🟢 HEALTHY CONTAINERS CARD
// ====================================

function HealthyContainersCard({
  containers,
}: {
  containers: ContainerMetric[];
}) {
  return (
    <div className="rounded-lg border border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/5 p-4">
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--success))] mb-2">
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-medium">
          {containers.length} Healthy Container
          {containers.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="text-xs text-[rgb(var(--foreground-muted))]">
        {containers.map((c) => c.containerName).join(", ")}
      </div>
    </div>
  );
}

// ====================================
// 🚨 ALERTS CARD
// ====================================

function AlertsCard({
  alerts,
  onClear,
}: {
  alerts: MonitorAlert[];
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Recent Alerts ({alerts.length})
        </h4>
        <button
          onClick={onClear}
          className="text-xs text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))] transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {alerts
          .slice()
          .reverse()
          .map((alert, index) => (
            <AlertItem key={alert.timestamp + index} alert={alert} />
          ))}
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: MonitorAlert }) {
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

// ====================================
// ⚪ EMPTY STATE
// ====================================

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
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
      <p className="text-[rgb(var(--foreground-muted))] mb-6 max-w-md mx-auto leading-relaxed">
        Monitor your Docker containers in real-time with AI-powered analysis,
        restart approvals, and Slack notifications
      </p>
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg surface border border-[rgb(var(--border))]">
          <Brain className="h-4 w-4 text-[rgb(var(--primary))]" />
          <span className="text-sm text-[rgb(var(--foreground-muted))]">
            AI Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg surface border border-[rgb(var(--border))]">
          <Shield className="h-4 w-4 text-[rgb(var(--success))]" />
          <span className="text-sm text-[rgb(var(--foreground-muted))]">
            Restart Approvals
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg surface border border-[rgb(var(--border))]">
          <MessageSquare className="h-4 w-4 text-[rgb(var(--warning))]" />
          <span className="text-sm text-[rgb(var(--foreground-muted))]">
            Slack Alerts
          </span>
        </div>
      </div>
      <button
        onClick={onStart}
        className="px-6 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center gap-2 mx-auto shadow-lg"
      >
        <Play className="h-4 w-4 fill-current" />
        Start Monitoring
      </button>
    </motion.div>
  );
} 