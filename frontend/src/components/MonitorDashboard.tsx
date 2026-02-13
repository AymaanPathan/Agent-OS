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
  Play,
  Pause,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  Loader2,
  Brain,
  X as CloseIcon,
  Cpu,
  MemoryStick,
  Send,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Shield,
  Hash,
  Bell,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

// ====================================
// 📊 TYPES
// ====================================

type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  issues?: string[];
  logs?: string;
};

type RestartApprovalRequest = {
  approvalId: string;
  containerName: string;
  reason: string;
};


export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [metrics, setMetrics] = useState<ContainerMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [restartApprovalRequest, setRestartApprovalRequest] =
    useState<RestartApprovalRequest | null>(null);
  const [processingRestart, setProcessingRestart] = useState(false);
  const [slackModal, setSlackModal] = useState<{
    containerName: string;
    message: string;
  } | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [analyzingContainer, setAnalyzingContainer] = useState<string | null>(
    null,
  );

  const [sessionId] = useState(
    () => `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );

  // Socket connection
  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      { transports: ["websocket", "polling"] },
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join-monitor", sessionId);
    });

    newSocket.on("monitor-check-completed", (data) => {
      if (data.result?.containers) {
        setMetrics(
          data.result.containers.map((c: any) => ({
            containerName: c.containerName || c.name,
            dockerHealthy: c.dockerHealthy ?? c.status === "running",
            applicationHealthy: c.applicationHealthy ?? true,
            cpuPercent: c.cpuPercent || "0%",
            memPercent: c.memPercent || "0%",
            severity: c.severity || "HEALTHY",
            issues: c.issues || [],
            logs: c.logs,
          })),
        );
      }
    });

    newSocket.on(
      "restart-approval-required",
      (data: RestartApprovalRequest) => {
        setRestartApprovalRequest(data);
      },
    );

    newSocket.on("container-restarting", () => {
      setProcessingRestart(true);
    });

    newSocket.on("restart-completed", (data) => {
      setRestartApprovalRequest(null);
      setProcessingRestart(false);
      addAlert(data.message);
    });

    newSocket.on("restart-rejected", (data) => {
      setRestartApprovalRequest(null);
      setProcessingRestart(false);
      addAlert(data.message);
    });

    newSocket.on("restart-error", (data) => {
      setRestartApprovalRequest(null);
      setProcessingRestart(false);
      addAlert(data.message);
    });

    newSocket.on("slack-notification-sent", (data) => {
      setSlackModal(null);
      addAlert(`✅ Slack notification sent to #${data.channel}`);
    });

    newSocket.on("ai-analysis-started", () => {
      // Already handled by analyzingContainer state
    });

    newSocket.on("ai-analysis-error", (data) => {
      setAnalyzingContainer(null);
      addAlert(`❌ AI analysis failed: ${data.error}`);
    });

    return () => {
      newSocket.emit("leave-monitor", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId]);

  const addAlert = (message: string) => {
    setAlerts((prev) => [...prev, message].slice(-5));
    setTimeout(() => {
      setAlerts((prev) => prev.slice(1));
    }, 5000);
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
            config: {
              targets: "containers",
              interval: 30,
              alertOnChange: true,
            },
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setIsMonitoring(true);
      } else {
        alert(`Failed to start: ${data.error}`);
      }
    } catch (error: any) {
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
        setMetrics([]);
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  };

  const handleRestartApproval = (approved: boolean) => {
    if (!socket || !restartApprovalRequest) return;

    socket.emit("restart-approval-response", {
      approvalId: restartApprovalRequest.approvalId,
      approved,
    });

    if (!approved) {
      // Immediately close modal if rejected
      setRestartApprovalRequest(null);
    }
    // If approved, keep modal open and show processing state
  };

  const handleAIAnalyze = (containerName: string) => {
    if (!socket) return;
    setAnalyzingContainer(containerName);
    socket.emit("ai-analyze-container", { sessionId, containerName });
  };

  const handleSendSlack = (containerName: string, defaultMessage: string) => {
    setSlackModal({ containerName, message: defaultMessage });
  };

  const sendSlackNotification = (channel: string, message: string) => {
    if (!socket || !slackModal) return;
    socket.emit("send-slack-notification", {
      sessionId,
      containerName: slackModal.containerName,
      channel,
      message,
      severity: "warning",
    });
  };

  const unhealthyContainers = metrics.filter((m) => m.severity !== "HEALTHY");
  const healthyCount = metrics.filter((m) => m.severity === "HEALTHY").length;

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Restart Approval Modal */}
      <AnimatePresence>
        {restartApprovalRequest && (
          <RestartApprovalModal
            request={restartApprovalRequest}
            processing={processingRestart}
            onApprove={() => handleRestartApproval(true)}
            onReject={() => handleRestartApproval(false)}
          />
        )}
      </AnimatePresence>

      {/* Slack Modal */}
      <AnimatePresence>
        {slackModal && (
          <SlackModal
            data={slackModal}
            onSend={sendSlackNotification}
            onClose={() => setSlackModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Alerts */}
      <AlertsContainer alerts={alerts} />

      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[rgb(var(--border))] rounded-lg transition-colors"
          >
            <CloseIcon className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[rgb(var(--primary))]" />
            <span className="font-semibold text-sm text-[rgb(var(--foreground))]">
              Container Monitor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMonitoring && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[rgb(var(--surface))] rounded-lg border border-[rgb(var(--border))]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--success))]" />
                <span className="text-xs font-medium">{healthyCount}</span>
              </div>
              <div className="w-px h-4 bg-[rgb(var(--border))]" />
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[rgb(var(--error))]" />
                <span className="text-xs font-medium">
                  {unhealthyContainers.length}
                </span>
              </div>
            </div>
          )}

          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </button>
          ) : (
            <button
              onClick={handleStopMonitoring}
              className="px-3 py-1.5 rounded-lg bg-[rgb(var(--error))] hover:opacity-90 text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto">
          {!isMonitoring ? (
            <EmptyState onStart={handleStartMonitoring} />
          ) : unhealthyContainers.length === 0 ? (
            <AllHealthyState healthyCount={healthyCount} />
          ) : (
            <div className="space-y-2">
              {unhealthyContainers.map((metric) => (
                <ContainerCard
                  key={metric.containerName}
                  metric={metric}
                  onAnalyze={handleAIAnalyze}
                  onRestart={(name) =>
                    socket?.emit("request-restart-approval", {
                      sessionId,
                      containerName: name,
                      reason: "Container showing critical issues",
                    })
                  }
                  onSlack={handleSendSlack}
                  isAnalyzing={analyzingContainer === metric.containerName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================
// 🧩 COMPONENTS
// ====================================

function RestartApprovalModal({
  request,
  processing,
  onApprove,
  onReject,
}: {
  request: RestartApprovalRequest;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[rgb(var(--surface-elevated))] rounded-xl border border-[rgb(var(--border))] p-5 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20">
            <Shield className="h-5 w-5 text-[rgb(var(--warning))]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[rgb(var(--foreground))] mb-1">
              Restart Approval Required
            </h3>
            <p className="text-sm text-[rgb(var(--foreground-muted))]">
              {request.reason}
            </p>
          </div>
        </div>

        <div className="bg-[rgb(var(--surface))] rounded-lg p-3 mb-4 border border-[rgb(var(--border))]">
          <div className="text-xs text-[rgb(var(--foreground-muted))] mb-1">
            Container
          </div>
          <div className="font-mono font-semibold text-sm text-[rgb(var(--foreground))]">
            {request.containerName}
          </div>
        </div>

        {processing ? (
          <div className="flex items-center justify-center gap-2 py-3 text-[rgb(var(--primary))]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Restarting container...</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] font-medium text-sm flex items-center justify-center gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white font-medium text-sm flex items-center justify-center gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Approve
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SlackModal({
  data,
  onSend,
  onClose,
}: {
  data: { containerName: string; message: string };
  onSend: (channel: string, message: string) => void;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState(data.message);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[rgb(var(--surface-elevated))] rounded-xl border border-[rgb(var(--border))] p-5 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[rgb(var(--foreground))]">
            Send to Slack
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[rgb(var(--border))] rounded-lg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[rgb(var(--foreground-muted))] block mb-1.5">
              Channel
            </label>
            <div className="relative">
              <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--foreground-muted))]" />
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="general"
                className="w-full pl-9 pr-3 py-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[rgb(var(--foreground-muted))] block mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (channel.trim()) {
                onSend(channel, message);
              }
            }}
            disabled={!channel.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ContainerCard({
  metric,
  onAnalyze,
  onRestart,
  onSlack,
  isAnalyzing,
}: {
  metric: ContainerMetric;
  onAnalyze: (name: string) => void;
  onRestart: (name: string) => void;
  onSlack: (name: string, message: string) => void;
  isAnalyzing: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLogs = () => {
    if (metric.logs) {
      navigator.clipboard.writeText(metric.logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityColor =
    metric.severity === "CRITICAL"
      ? "border-[rgb(var(--error))]/20 bg-[rgb(var(--error))]/5"
      : "border-[rgb(var(--warning))]/20 bg-[rgb(var(--warning))]/5";

  return (
    <div
      className={`rounded-lg border ${severityColor} p-3 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {metric.severity === "CRITICAL" ? (
            <XCircle className="h-4 w-4 text-[rgb(var(--error))] flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))] flex-shrink-0" />
          )}
          <span className="font-medium text-sm text-[rgb(var(--foreground))]">
            {metric.containerName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <Cpu className="h-3 w-3" />
            {metric.cpuPercent}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <MemoryStick className="h-3 w-3" />
            {metric.memPercent}
          </div>
        </div>
      </div>

      {metric.issues && metric.issues.length > 0 && (
        <div className="mb-2 space-y-1">
          {metric.issues.map((issue, i) => (
            <div
              key={i}
              className="text-xs text-[rgb(var(--error))] flex items-start gap-1"
            >
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {showLogs && metric.logs && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
              Logs
            </span>
            <button
              onClick={copyLogs}
              className="text-xs px-2 py-0.5 hover:bg-[rgb(var(--border))] rounded flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-[#1a1a1a] rounded p-2 max-h-32 overflow-y-auto">
            <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
              {metric.logs}
            </pre>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        {isAnalyzing ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-1.5 text-[rgb(var(--primary))]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        ) : (
          <button
            onClick={() => onAnalyze(metric.containerName)}
            className="flex-1 px-3 py-1.5 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" />
            AI Analyze
          </button>
        )}
        <button
          onClick={() => onRestart(metric.containerName)}
          className="px-3 py-1.5 bg-[rgb(var(--warning))]/10 hover:bg-[rgb(var(--warning))]/20 text-[rgb(var(--warning))] border border-[rgb(var(--warning))]/20 rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </button>
        <button
          onClick={() =>
            onSlack(
              metric.containerName,
              `🚨 ${metric.containerName} - ${metric.severity}`,
            )
          }
          className="px-3 py-1.5 bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] border border-[rgb(var(--border))] rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
        {metric.logs && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-2 py-1.5 bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] border border-[rgb(var(--border))] rounded-lg text-xs"
          >
            <Terminal className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AlertsContainer({ alerts }: { alerts: string[] }) {
  return (
    <div className="fixed top-4 right-4 z-40 space-y-2 max-w-md">
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg p-3 shadow-lg flex items-start gap-2"
          >
            <Bell className="h-4 w-4 text-[rgb(var(--primary))] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[rgb(var(--foreground))]">
              {alert}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] flex items-center justify-center mb-4">
        <Activity className="h-8 w-8 text-[rgb(var(--primary))]" />
      </div>
      <h2 className="text-xl font-bold text-[rgb(var(--foreground))] mb-2">
        Start Container Monitoring
      </h2>
      <p className="text-sm text-[rgb(var(--foreground-muted))] mb-6 text-center max-w-md">
        Monitor your Docker containers with AI-powered analysis, restart
        approvals, and Slack notifications
      </p>
      <button
        onClick={onStart}
        className="px-5 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white font-medium flex items-center gap-2"
      >
        <Play className="h-4 w-4" />
        Start Monitoring
      </button>
    </div>
  );
}

function AllHealthyState({ healthyCount }: { healthyCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--success))]/10 border border-[rgb(var(--success))]/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-[rgb(var(--success))]" />
      </div>
      <h2 className="text-xl font-bold text-[rgb(var(--foreground))] mb-2">
        All Containers Healthy
      </h2>
      <p className="text-sm text-[rgb(var(--foreground-muted))]">
        {healthyCount} container{healthyCount !== 1 ? "s" : ""} running smoothly
      </p>
    </div>
  );
}
