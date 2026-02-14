/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from "react";
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
  Sparkles,
  Copy,
  Check,
  Loader2,
  Brain,
  Send,
  RotateCcw,
  Shield,
  Hash,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Search,
  X as CloseIcon,
  Cpu,
  MemoryStick,
  Network,
  HardDrive,
  Clock,
  RefreshCw,
  Container as ContainerIcon,
  ThumbsUp,
  ThumbsDown,
  Filter,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

// Types
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

type RestartApprovalRequest = {
  approvalId: string;
  containerName: string;
  reason: string;
};

export default function MonitorDashboard({ onClose }: { onClose: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [availableContainers, setAvailableContainers] = useState<
    ContainerInfo[]
  >([]);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<ContainerMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedContainer, setExpandedContainer] = useState<string | null>(
    null,
  );
  const [analyzingContainer, setAnalyzingContainer] = useState<string | null>(
    null,
  );
  const [restartApprovalRequest, setRestartApprovalRequest] =
    useState<RestartApprovalRequest | null>(null);
  const [processingRestart, setProcessingRestart] = useState(false);
  const [slackModal, setSlackModal] = useState<{
    containerName: string;
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "running" | "stopped"
  >("all");

  const [sessionId] = useState(
    () => `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );

  const [settings, setSettings] = useState({
    interval: 30,
    autoFix: true,
    alertOnChange: true,
  });

  const stats = useMemo(() => {
    return {
      totalContainers: metrics.length,
      healthyCount: metrics.filter((m) => m.severity === "HEALTHY").length,
      warningCount: metrics.filter((m) => m.severity === "WARNING").length,
      criticalCount: metrics.filter((m) => m.severity === "CRITICAL").length,
    };
  }, [metrics]);

  const filteredContainers = useMemo(() => {
    return availableContainers.filter((container) => {
      const matchesSearch =
        container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.image.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "running" &&
          container.status.toLowerCase().includes("up")) ||
        (filterStatus === "stopped" &&
          !container.status.toLowerCase().includes("up"));

      return matchesSearch && matchesFilter;
    });
  }, [availableContainers, searchQuery, filterStatus]);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join-monitor", sessionId);
    });

    newSocket.on("monitor-check-completed", (data) => {
      if (data.result?.containers) {
        setMetrics(data.result.containers);
      }
    });

    newSocket.on("monitor-alert", (alert) => {
      setAlerts((prev) => [...prev, alert].slice(-100));
      if (soundEnabled && alert.severity === "critical") {
        playAlertSound();
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
      addAlert("info", data.message);
    });

    newSocket.on("restart-rejected", (data) => {
      setRestartApprovalRequest(null);
      setProcessingRestart(false);
      addAlert("info", data.message);
    });

    newSocket.on("restart-error", (data) => {
      setRestartApprovalRequest(null);
      setProcessingRestart(false);
      addAlert("critical", data.message);
    });

    newSocket.on("ai-analysis-complete", (data) => {
      setAnalyzingContainer(null);
      addAlert("info", `AI analysis completed for ${data.containerName}`);
    });

    newSocket.on("ai-analysis-error", (data) => {
      setAnalyzingContainer(null);
      addAlert("critical", `AI analysis failed: ${data.error}`);
    });

    newSocket.on("slack-notification-sent", (data) => {
      setSlackModal(null);
      addAlert("info", `✅ Slack notification sent to #${data.channel}`);
    });

    return () => {
      newSocket.emit("leave-monitor", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId, soundEnabled]);

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    try {
      setIsLoadingContainers(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/monitor/containers`,
      );
      const data = await response.json();

      if (data.success) {
        setAvailableContainers(data.containers);
        const runningContainers = data.containers
          .filter((c: ContainerInfo) => c.status.toLowerCase().includes("up"))
          .map((c: ContainerInfo) => c.name);
        setSelectedContainers(runningContainers);
      }
    } catch (error) {
      console.error("Failed to load containers:", error);
    } finally {
      setIsLoadingContainers(false);
    }
  };

  const playAlertSound = () => {
    if (typeof Audio !== "undefined") {
      const audio = new Audio("/alert.mp3");
      audio.play().catch((e) => console.log("Audio play failed:", e));
    }
  };

  const addAlert = (
    severity: "info" | "warning" | "critical",
    message: string,
  ) => {
    setAlerts((prev) =>
      [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message,
          severity,
          details: {},
        },
      ].slice(-100),
    );
  };

  const handleStartMonitoring = async () => {
    if (selectedContainers.length === 0) {
      alert("Please select at least one container to monitor");
      return;
    }

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
              ...settings,
              targets: "containers",
              selectedContainers,
            },
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setIsMonitoring(true);
      } else {
        alert(`Failed to start monitoring: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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
        setMetrics([]);
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  };

  const toggleContainerSelection = (containerName: string) => {
    setSelectedContainers((prev) =>
      prev.includes(containerName)
        ? prev.filter((c) => c !== containerName)
        : [...prev, containerName],
    );
  };

  const selectAllRunning = () => {
    const runningContainers = availableContainers
      .filter((c) => c.status.toLowerCase().includes("up"))
      .map((c) => c.name);
    setSelectedContainers(runningContainers);
  };

  const clearSelection = () => {
    setSelectedContainers([]);
  };

  const handleAIAnalyze = (containerName: string) => {
    if (!socket) return;
    setAnalyzingContainer(containerName);
    socket.emit("ai-analyze-container", { sessionId, containerName });
  };

  const handleRestartApproval = (approved: boolean) => {
    if (!socket || !restartApprovalRequest) return;

    socket.emit("restart-approval-response", {
      approvalId: restartApprovalRequest.approvalId,
      approved,
    });

    if (!approved) {
      setRestartApprovalRequest(null);
    }
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

  const criticalContainers = metrics.filter((m) => m.severity === "CRITICAL");
  const warningContainers = metrics.filter((m) => m.severity === "WARNING");
  const healthyContainers = metrics.filter((m) => m.severity === "HEALTHY");

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      <AnimatePresence>
        {restartApprovalRequest && (
          <RestartApprovalModal
            request={restartApprovalRequest}
            processing={processingRestart}
            onApprove={() => handleRestartApproval(true)}
            onReject={() => handleRestartApproval(false)}
          />
        )}

        {slackModal && (
          <SlackModal
            data={slackModal}
            onSend={sendSlackNotification}
            onClose={() => setSlackModal(null)}
          />
        )}
      </AnimatePresence>

      <AlertsContainer alerts={alerts.slice(-5)} />

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
              className="p-2 hover:bg-[rgb(var(--border))] rounded-lg transition-colors"
              title="Close"
            >
              <CloseIcon className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
                <Activity className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>

              <div>
                <div className="text-base font-bold text-[rgb(var(--foreground))]">
                  Container Monitoring Dashboard
                </div>
                <div className="text-xs text-[rgb(var(--foreground-muted))]">
                  Real-time monitoring with AI-powered insights
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isMonitoring && (
              <div className="flex items-center gap-3 px-4 py-2 bg-[rgb(var(--surface))] rounded-lg border border-[rgb(var(--border))]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />
                  <span className="text-sm font-medium">
                    {stats.healthyCount}
                  </span>
                </div>
                <div className="w-px h-5 bg-[rgb(var(--border))]" />
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />
                  <span className="text-sm font-medium">
                    {stats.warningCount}
                  </span>
                </div>
                <div className="w-px h-5 bg-[rgb(var(--border))]" />
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-[rgb(var(--error))]" />
                  <span className="text-sm font-medium">
                    {stats.criticalCount}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`p-2 rounded-lg transition-colors ${
                showAlerts
                  ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                  : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground-muted))]"
              }`}
              title={showAlerts ? "Hide alerts" : "Show alerts"}
            >
              {showAlerts ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled
                  ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                  : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground-muted))]"
              }`}
              title={soundEnabled ? "Disable sound" : "Enable sound"}
            >
              {soundEnabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>

            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                disabled={isStarting || selectedContainers.length === 0}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Monitoring
                  </>
                )}
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
      <div className="flex-1 overflow-hidden flex">
        {!isMonitoring && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 border-r border-[rgb(var(--border))] surface-elevated flex flex-col"
          >
            <div className="p-4 border-b border-[rgb(var(--border))]">
              <h3 className="text-sm font-bold text-[rgb(var(--foreground))] mb-3 flex items-center gap-2">
                <ContainerIcon className="h-4 w-4" />
                Select Containers to Monitor
              </h3>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--foreground-muted))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search containers..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent text-[rgb(var(--foreground))]"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === "all"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("running")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === "running"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
                  }`}
                >
                  Running
                </button>
                <button
                  onClick={() => setFilterStatus("stopped")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === "stopped"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
                  }`}
                >
                  Stopped
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={selectAllRunning}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] transition-colors"
                >
                  Select All Running
                </button>
                <button
                  onClick={clearSelection}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingContainers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--primary))]" />
                </div>
              ) : filteredContainers.length === 0 ? (
                <div className="text-center py-12">
                  <ContainerIcon className="h-8 w-8 text-[rgb(var(--foreground-muted))] mx-auto mb-2" />
                  <p className="text-sm text-[rgb(var(--foreground-muted))]">
                    No containers found
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContainers.map((container) => (
                    <ContainerSelectionCard
                      key={container.id}
                      container={container}
                      selected={selectedContainers.includes(container.name)}
                      onToggle={() => toggleContainerSelection(container.name)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              <div className="text-sm text-[rgb(var(--foreground))]">
                <span className="font-bold">{selectedContainers.length}</span>{" "}
                container
                {selectedContainers.length !== 1 ? "s" : ""} selected
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {isMonitoring ? (
              <>
                {criticalContainers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[rgb(var(--error))] flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Critical Issues ({criticalContainers.length})
                    </h4>
                    <div className="space-y-2">
                      {criticalContainers.map((metric, index) => (
                        <ContainerMetricCard
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
                          onAIAnalyze={handleAIAnalyze}
                          onRestart={(name) =>
                            socket?.emit("request-restart-approval", {
                              sessionId,
                              containerName: name,
                              reason: "Container showing critical issues",
                            })
                          }
                          onSlack={handleSendSlack}
                          isAnalyzing={
                            analyzingContainer === metric.containerName
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {warningContainers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[rgb(var(--warning))] flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings ({warningContainers.length})
                    </h4>
                    <div className="space-y-2">
                      {warningContainers.map((metric, index) => (
                        <ContainerMetricCard
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
                          onAIAnalyze={handleAIAnalyze}
                          onRestart={(name) =>
                            socket?.emit("request-restart-approval", {
                              sessionId,
                              containerName: name,
                              reason: "Container showing warning signs",
                            })
                          }
                          onSlack={handleSendSlack}
                          isAnalyzing={
                            analyzingContainer === metric.containerName
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {healthyContainers.length > 0 && (
                  <div className="rounded-lg border border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--success))]">
                      <CheckCircle2 className="h-4 w-4" />
                      {healthyContainers.length} Healthy Container
                      {healthyContainers.length !== 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-[rgb(var(--foreground-muted))] mt-2">
                      {healthyContainers.map((c) => c.containerName).join(", ")}
                    </div>
                  </div>
                )}

                {showAlerts && alerts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
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
            ) : (
              <EmptyStateMessage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component implementations continue in next part...
// Part 2: Helper Components and Modals

function ContainerSelectionCard({
  container,
  selected,
  onToggle,
}: {
  container: ContainerInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  const isRunning = container.status.toLowerCase().includes("up");

  return (
    <button
      onClick={onToggle}
      className={`w-full p-3 rounded-lg border transition-all text-left ${
        selected
          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
          : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              selected
                ? "bg-[rgb(var(--primary))] border-[rgb(var(--primary))]"
                : "bg-transparent border-[rgb(var(--border))]"
            }`}
          >
            {selected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[rgb(var(--foreground))] truncate">
              {container.name}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                isRunning
                  ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))] border border-[rgb(var(--success))]/20"
                  : "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))] border border-[rgb(var(--error))]/20"
              }`}
            >
              {isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>
          <p className="text-xs text-[rgb(var(--foreground-muted))] truncate">{container.image}</p>
          <p className="text-[10px] text-[rgb(var(--foreground-subtle))] mt-1 truncate">
            {container.id}
          </p>
        </div>
      </div>
    </button>
  );
}

function ContainerMetricCard({
  metric,
  index,
  isExpanded,
  onToggle,
  onAIAnalyze,
  onRestart,
  onSlack,
  isAnalyzing,
}: {
  metric: ContainerMetric;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAIAnalyze: (containerName: string) => void;
  onRestart: (containerName: string) => void;
  onSlack: (containerName: string, message: string) => void;
  isAnalyzing: boolean;
}) {
  const [copiedLogs, setCopiedLogs] = useState(false);

  const copyLogs = () => {
    if (metric.logs) {
      navigator.clipboard.writeText(metric.logs);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-[rgb(var(--border))]/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className={`h-4 w-4 ${config.text} flex-shrink-0`} />
            <span className="font-bold text-sm text-[rgb(var(--foreground))] truncate">
              {metric.containerName}
            </span>
          </div>
          <span className={`text-[10px] font-bold ${config.text} uppercase`}>
            {metric.severity}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-3">
          <MetricBadge icon={Cpu} label="CPU" value={metric.cpuPercent} />
          <MetricBadge icon={MemoryStick} label="Memory" value={metric.memPercent} />
          <MetricBadge icon={Network} label="Net In" value={metric.networkIn} />
          <MetricBadge icon={Network} label="Net Out" value={metric.networkOut} />
          <MetricBadge icon={HardDrive} label="Disk Read" value={metric.diskRead} />
          <MetricBadge icon={Clock} label="Uptime" value={metric.uptime} />
        </div>

        {metric.issues && metric.issues.length > 0 && (
          <div className="mt-3 text-xs text-[rgb(var(--error))] flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{metric.issues[0]}</span>
          </div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="surface-elevated rounded-lg p-3 border border-[rgb(var(--border))]">
                  <div className="text-[10px] text-[rgb(var(--foreground-muted))] mb-1">
                    Restart Count
                  </div>
                  <div className="text-lg font-bold text-[rgb(var(--foreground))]">
                    {metric.restartCount}
                  </div>
                </div>
                <div className="surface-elevated rounded-lg p-3 border border-[rgb(var(--border))]">
                  <div className="text-[10px] text-[rgb(var(--foreground-muted))] mb-1">
                    Memory Usage
                  </div>
                  <div className="text-sm font-bold text-[rgb(var(--foreground))]">
                    {metric.memUsage} / {metric.memLimit}
                  </div>
                </div>
                <div className="surface-elevated rounded-lg p-3 border border-[rgb(var(--border))]">
                  <div className="text-[10px] text-[rgb(var(--foreground-muted))] mb-1">
                    HTTP Health
                  </div>
                  <div className="text-sm font-bold">
                    {metric.httpHealthStatus?.checked ? (
                      metric.httpHealthStatus.healthy ? (
                        <span className="text-[rgb(var(--success))]">✓ Healthy</span>
                      ) : (
                        <span className="text-[rgb(var(--error))]">✗ Failed</span>
                      )
                    ) : (
                      <span className="text-[rgb(var(--foreground-muted))]">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {metric.logs && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[rgb(var(--foreground))]">
                      Container Logs
                    </span>
                    <button
                      onClick={copyLogs}
                      className="text-xs px-2 py-1 rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] transition-colors flex items-center gap-1"
                    >
                      {copiedLogs ? (
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
                  <div className="rounded-lg bg-[#1a1a1a] border border-[rgb(var(--border))] p-3 max-h-64 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                      {metric.logs}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {isAnalyzing ? (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2 text-[rgb(var(--primary))]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Analyzing...</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onAIAnalyze(metric.containerName)}
                      className="flex-1 px-4 py-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      AI Analyze
                    </button>
                    <button
                      onClick={() => onRestart(metric.containerName)}
                      className="px-4 py-2 bg-[rgb(var(--warning))]/10 hover:bg-[rgb(var(--warning))]/20 text-[rgb(var(--warning))] border border-[rgb(var(--warning))]/20 rounded-lg text-xs font-medium flex items-center gap-2"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restart
                    </button>
                    <button
                      onClick={() =>
                        onSlack(metric.containerName, `🚨 ${metric.containerName} - ${metric.severity}`)
                      }
                      className="px-4 py-2 bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] border border-[rgb(var(--border))] rounded-lg text-xs font-medium"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetricBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="surface-elevated rounded-lg p-2 border border-[rgb(var(--border))]">
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3 text-[rgb(var(--foreground-muted))]" />
        <span className="text-[9px] text-[rgb(var(--foreground-muted))] uppercase">{label}</span>
      </div>
      <div className="text-xs font-bold text-[rgb(var(--foreground))]">{value}</div>
    </div>
  );
}

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
        className="surface-elevated rounded-xl border border-[rgb(var(--border))] p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-lg bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20">
            <Shield className="h-6 w-6 text-[rgb(var(--warning))]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[rgb(var(--foreground))] mb-1">
              Restart Approval Required
            </h3>
            <p className="text-sm text-[rgb(var(--foreground-muted))]">
              This action requires your confirmation
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[rgb(var(--foreground-muted))] text-xs mb-1">Container</div>
                <div className="font-mono font-medium text-[rgb(var(--foreground))]">
                  {request.containerName}
                </div>
              </div>
              <div>
                <div className="text-[rgb(var(--foreground-muted))] text-xs mb-1">Action</div>
                <div className="font-bold text-[rgb(var(--primary))]">RESTART</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
              <div className="text-[rgb(var(--foreground-muted))] text-xs mb-1">Reason</div>
              <div className="text-sm text-[rgb(var(--foreground))]">{request.reason}</div>
            </div>
          </div>
        </div>

        {processing ? (
          <div className="flex items-center justify-center gap-2 py-3 text-[rgb(var(--primary))]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Restarting container...</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 px-4 py-3 rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex-1 px-4 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center justify-center gap-2"
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
        className="surface-elevated rounded-xl border border-[rgb(var(--border))] p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[rgb(var(--foreground))]">Send to Slack</h3>
          <button onClick={onClose} className="p-1 hover:bg-[rgb(var(--surface))] rounded-lg transition-colors">
            <CloseIcon className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[rgb(var(--foreground))] block mb-2">Channel</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--foreground-muted))]" />
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="general"
                className="w-full pl-10 pr-3 py-2.5 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent text-[rgb(var(--foreground))]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[rgb(var(--foreground))] block mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-transparent resize-none text-[rgb(var(--foreground))]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--surface))] hover:bg-[rgb(var(--border))] text-[rgb(var(--foreground))] font-medium transition-colors"
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
            className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AlertsContainer({ alerts }: { alerts: MonitorAlert[] }) {
  return (
    <div className="fixed top-6 right-6 z-40 space-y-2 max-w-md">
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div
            key={alert.timestamp + i}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <AlertCard alert={alert} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AlertCard({ alert }: { alert: MonitorAlert }) {
  const getConfig = () => {
    switch (alert.severity) {
      case "critical":
        return {
          bg: "bg-[rgb(var(--error))]/10",
          border: "border-[rgb(var(--error))]/20",
          icon: <XCircle className="h-4 w-4 text-[rgb(var(--error))]" />,
          text: "text-[rgb(var(--error))]",
        };
      case "warning":
        return {
          bg: "bg-[rgb(var(--warning))]/10",
          border: "border-[rgb(var(--warning))]/20",
          icon: <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />,
          text: "text-[rgb(var(--warning))]",
        };
      default:
        return {
          bg: "bg-[rgb(var(--primary))]/10",
          border: "border-[rgb(var(--primary))]/20",
          icon: <CheckCircle2 className="h-4 w-4 text-[rgb(var(--primary))]" />,
          text: "text-[rgb(var(--primary))]",
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`rounded-xl p-4 border ${config.border} ${config.bg} surface-elevated shadow-lg backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${config.text} mb-1`}>{alert.message}</div>
          <div className="text-xs text-[rgb(var(--foreground-muted))]">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStateMessage() {
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
        Select Containers to Monitor
      </h2>
      <p className="text-[rgb(var(--foreground-muted))] mb-4 max-w-md mx-auto">
        Choose containers from the sidebar and click &quot;Start Monitoring&quot; to begin real-time health
        monitoring
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-sm text-[rgb(var(--foreground-muted))]">
        <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
        AI-powered analysis and auto-healing enabled
      </div>
    </motion.div>
  );
}