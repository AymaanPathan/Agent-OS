/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Activity,
  Clock,
  ChevronLeft,
  ChevronDown,
  Copy,
  Download,
  AlertTriangle,
  Database,
  FileText,
  Box,
  Code,
  Zap,
  Globe,
  Container,
  Terminal,
  Server,
  MessageSquare,
  Brain,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { MonitorDashboardPanel } from "../nodes/MonitorDashboardPanel";

// ====================================
// 🎯 TYPES
// ====================================

type NodeExecutionLog = {
  nodeId: string;
  nodeType: string;
  label: string;
  stepIndex: number;
  status: "pending" | "running" | "success" | "failed" | "paused";
  startTime?: string;
  endTime?: string;
  duration?: number;
  config?: any;
  output?: any;
  error?: string;
  toolName?: string;
};

type LogEntry = {
  id: string;
  timestamp: string;
  type: string;
  level: "info" | "success" | "warning" | "error" | "debug";
  message: string;
  data?: any;
  nodeId?: string;
  toolName?: string;
  output?: any;
  duration?: number;
};

// ====================================
// 🎨 NODE TYPE CONFIGURATIONS
// ====================================

const nodeTypeConfig: Record<
  string,
  {
    icon: any;
    color: string;
    bg: string;
    border: string;
    badge: string;
    label: string;
  }
> = {
  "tool.httpHealth": {
    icon: Globe,
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-300",
    label: "HTTP Health",
  },
  "tool.dockerStatus": {
    icon: Container,
    color: "text-cyan-400",
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    badge: "bg-cyan-500/20 text-cyan-300",
    label: "Docker Status",
  },
  "tool.dockerLogs": {
    icon: Terminal,
    color: "text-purple-400",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    badge: "bg-purple-500/20 text-purple-300",
    label: "Docker Logs",
  },
  "tool.dockerRestart": {
    icon: Activity,
    color: "text-orange-400",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-300",
    label: "Docker Restart",
  },
  "tool.dockerRollback": {
    icon: Clock,
    color: "text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    badge: "bg-red-500/20 text-red-300",
    label: "Docker Rollback",
  },
  "tool.dockerListAll": {
    icon: Server,
    color: "text-green-400",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    badge: "bg-green-500/20 text-green-300",
    label: "List Containers",
  },
  "tool.dockerBulkRestart": {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-300",
    label: "Bulk Restart",
  },
  "tool.dockerBulkLogs": {
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    badge: "bg-indigo-500/20 text-indigo-300",
    label: "Bulk Logs",
  },
  "tool.slackNotify": {
    icon: MessageSquare,
    color: "text-pink-400",
    bg: "bg-pink-500/5",
    border: "border-pink-500/20",
    badge: "bg-pink-500/20 text-pink-300",
    label: "Slack Notify",
  },
  "agent.aiAnalyzer": {
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    badge: "bg-violet-500/20 text-violet-300",
    label: "AI Analyzer",
  },
  "logic.approval": {
    icon: ShieldCheck,
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/20 text-amber-300",
    label: "Approval Gate",
  },
  "logic.ifelse": {
    icon: Code,
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-300",
    label: "If/Else Router",
  },
  "tool.healthCheckScanner": {
    icon: Activity,
    color: "text-teal-400",
    bg: "bg-teal-500/5",
    border: "border-teal-500/20",
    badge: "bg-teal-500/20 text-teal-300",
    label: "Health Scanner",
  },
  "monitor.continuous": {
    icon: Activity,
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-300",
    label: "Continuous Monitor",
  },
  default: {
    icon: Box,
    color: "text-zinc-400",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    badge: "bg-zinc-500/20 text-zinc-300",
    label: "Unknown",
  },
};

// ====================================
// 🗂️ OUTPUT VIEWER
// ====================================

function OutputViewer({ data }: { data: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (value: any, depth = 0): any => {
    if (value === null) return <span className="text-zinc-600">null</span>;
    if (value === undefined)
      return <span className="text-zinc-600">undefined</span>;

    if (typeof value === "boolean") {
      return (
        <span className={value ? "text-green-400" : "text-red-400"}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === "number") {
      return <span className="text-purple-400">{value}</span>;
    }

    if (typeof value === "string") {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {value}
          </a>
        );
      }

      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return (
          <span className="text-cyan-400">
            {new Date(value).toLocaleString()}
          </span>
        );
      }

      return <span className="text-yellow-300">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-zinc-600">[]</span>;
      }
      return (
        <div className="ml-3 space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-zinc-600 text-xs">[{idx}]</span>
              <div className="flex-1">{renderValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-zinc-600">{"{}"}</span>;
      }

      return (
        <div className="ml-3 space-y-1.5">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-zinc-500 text-xs font-medium min-w-fit">
                {key}:
              </span>
              <div className="flex-1">{renderValue(val, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-zinc-400">{String(value)}</span>;
  };

  return (
    <div className="relative rounded-lg bg-black/40 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Output</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors text-xs text-zinc-500 hover:text-zinc-300"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="p-3 max-h-64 overflow-auto text-sm font-mono">
        {renderValue(data)}
      </div>
    </div>
  );
}

// ====================================
// 📇 NODE EXECUTION CARD
// ====================================

function NodeExecutionCard({
  node,
  index,
}: {
  node: NodeExecutionLog;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const config = nodeTypeConfig[node.nodeType] || nodeTypeConfig.default;
  const Icon = config.icon;

  const hasOutput = node.output && Object.keys(node.output).length > 0;
  const hasConfig = node.config && Object.keys(node.config).length > 0;
  const hasDetails = hasOutput || hasConfig || node.error;

  const statusConfig: Record<
    string,
    {
      icon: any;
      color: string;
      bg: string;
      label: string;
      animate?: boolean;
    }
  > = {
    pending: {
      icon: Clock,
      color: "text-zinc-500",
      bg: "bg-zinc-500/10",
      label: "Pending",
    },
    running: {
      icon: Loader2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      label: "Running",
      animate: true,
    },
    success: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      label: "Success",
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      label: "Failed",
    },
    paused: {
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      label: "Paused",
    },
  };

  const status = statusConfig[node.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Connector Line */}
      {index > 0 && (
        <div className="absolute left-8 -top-4 w-0.5 h-4 bg-gradient-to-b from-zinc-700 to-transparent" />
      )}

      <div
        className={`rounded-xl border-2 ${config.border} ${config.bg} overflow-hidden`}
      >
        {/* Card Header */}
        <div
          className={`p-4 cursor-pointer transition-colors ${hasDetails ? "hover:bg-white/[0.02]" : ""}`}
          onClick={() => hasDetails && setExpanded(!expanded)}
        >
          <div className="flex items-start gap-4">
            {/* Step Number & Connector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-400">
                  {node.stepIndex}
                </span>
              </div>
              {index < 10 && ( // Assuming max 10 steps visible
                <div className="w-0.5 h-6 bg-zinc-800" />
              )}
            </div>

            {/* Node Icon */}
            <div className={`flex-shrink-0 p-3 rounded-xl ${config.badge}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>

            {/* Node Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-base ${config.color}`}>
                      {node.label}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md ${config.badge} font-medium`}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="font-mono">
                      {node.startTime
                        ? new Date(node.startTime).toLocaleTimeString()
                        : "Not started"}
                    </span>
                    {node.duration !== undefined && (
                      <>
                        <span>•</span>
                        <span
                          className={
                            node.duration > 5000 ? "text-yellow-400" : ""
                          }
                        >
                          {node.duration}ms
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bg}`}
                >
                  {status.animate ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    </motion.div>
                  ) : (
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                  )}
                  <span className={`text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Node ID Badge */}
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800">
                <Box className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] font-mono text-zinc-500">
                  {node.nodeId}
                </span>
              </div>
            </div>

            {/* Expand Indicator */}
            {hasDetails && (
              <motion.div
                animate={{ rotate: expanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <ChevronDown className="h-5 w-5 text-zinc-600" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Expandable Details */}
        <AnimatePresence>
          {expanded && hasDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-zinc-800 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Error Display */}
                {node.error && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-red-400 mb-1">
                          Error
                        </div>
                        <div className="text-xs text-red-300 font-mono">
                          {node.error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration */}
                {hasConfig && (
                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                      <Code className="h-3.5 w-3.5" />
                      Configuration
                    </div>
                    <OutputViewer data={node.config} />
                  </div>
                )}

                {/* Output */}
                {hasOutput && (
                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                      <Database className="h-3.5 w-3.5" />
                      Execution Output
                    </div>
                    <OutputViewer data={node.output} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Arrow to Next Step */}
      {node.status === "success" && index < 10 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center my-2"
        >
          <ArrowRight className="h-4 w-4 text-zinc-700" />
        </motion.div>
      )}
    </motion.div>
  );
}

// ====================================
// 🎨 MAIN RUN DASHBOARD
// ====================================

export default function RunDashboard({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodeExecutions, setNodeExecutions] = useState<
    Map<string, NodeExecutionLog>
  >(new Map());
  const [runStatus, setRunStatus] = useState<"running" | "success" | "failed">(
    "running",
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [stats, setStats] = useState({
    totalNodes: 0,
    completedNodes: 0,
  });

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [nodeExecutions, autoScroll]);

  // Socket connection
  useEffect(() => {
    if (!runId) return;

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current = socket;
    socket.emit("join-run", runId);

    socket.on("workflow_started", (data) => {
      setStats((s) => ({ ...s, totalNodes: data.totalNodes || 0 }));
    });

    socket.on("node_started", (data) => {
      setNodeExecutions((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.nodeId, {
          nodeId: data.nodeId,
          nodeType: data.nodeType,
          label: data.label,
          stepIndex: data.stepIndex,
          status: "running",
          startTime: data.timestamp,
          config: data.config,
        });
        return newMap;
      });
    });

    socket.on("node_completed", (data) => {
      setNodeExecutions((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.nodeId) || ({} as NodeExecutionLog);
        newMap.set(data.nodeId, {
          ...existing,
          status: "success",
          endTime: data.timestamp,
          duration: data.duration,
          output: data.output,
        });
        return newMap;
      });
      setStats((s) => ({ ...s, completedNodes: s.completedNodes + 1 }));
    });

    socket.on("node_failed", (data) => {
      setNodeExecutions((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.nodeId) || ({} as NodeExecutionLog);
        newMap.set(data.nodeId, {
          ...existing,
          status: "failed",
          endTime: data.timestamp,
          error: data.message,
        });
        return newMap;
      });
    });

    socket.on("approval_required", (data) => {
      setPendingApproval(data);
      setNodeExecutions((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.nodeId) || ({} as NodeExecutionLog);
        newMap.set(data.nodeId, {
          ...existing,
          status: "paused",
        });
        return newMap;
      });
    });

    socket.on("approval_received", (data) => {
      setPendingApproval(null);
      setNodeExecutions((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.nodeId) || ({} as NodeExecutionLog);
        newMap.set(data.nodeId, {
          ...existing,
          status: data.approved ? "success" : "failed",
        });
        return newMap;
      });
    });

    socket.on("workflow_completed", () => {
      setRunStatus("success");
    });

    socket.on("workflow_failed", () => {
      setRunStatus("failed");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [runId]);

  const handleApproval = (approved: boolean) => {
    socketRef.current?.emit("approval_response", {
      runId,
      nodeId: pendingApproval?.nodeId,
      approved,
    });
  };

  const downloadLogs = () => {
    const logs = Array.from(nodeExecutions.values());
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-execution-${runId}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress =
    stats.totalNodes > 0 ? (stats.completedNodes / stats.totalNodes) * 100 : 0;

  const sortedNodes = Array.from(nodeExecutions.values()).sort(
    (a, b) => a.stepIndex - b.stepIndex,
  );

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-400" />
            </motion.button>

            <div className="flex items-center gap-3">
              {runStatus === "running" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-5 w-5 text-blue-400" />
                </motion.div>
              )}
              {runStatus === "success" && (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              )}
              {runStatus === "failed" && (
                <XCircle className="h-5 w-5 text-red-400" />
              )}

              <div>
                <div className="text-base font-bold text-white">
                  Workflow Execution
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Run {runId.slice(0, 8)} • {stats.completedNodes}/
                  {stats.totalNodes} steps
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                autoScroll
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              Auto-scroll {autoScroll ? "ON" : "OFF"}
            </button>

            <button
              onClick={downloadLogs}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>

            <div className="h-2 w-48 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* APPROVAL BANNER */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-orange-500/20 bg-gradient-to-r from-orange-950/30 to-red-950/30"
          >
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="font-semibold text-orange-200">
                    Approval Required
                  </div>
                  <div className="text-xs text-orange-300/80 mt-0.5">
                    {pendingApproval.message}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval(false)}
                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-xs font-medium text-red-200"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApproval(true)}
                  className="px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-xs font-medium text-green-200"
                >
                  Approve
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXECUTION FLOW */}
      <div ref={containerRef} className="flex-1 overflow-auto p-6">
        {sortedNodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <Terminal className="h-16 w-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Waiting for execution...
            </h3>
            <p className="text-sm text-zinc-500">
              Workflow steps will appear here as they execute
            </p>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {/* ✅ ADD THIS: Monitor Dashboard Panel */}
            <MonitorDashboardPanel socket={socketRef.current} runId={runId} />

            {/* Existing node execution cards */}
            {sortedNodes.map((node, index) => (
              <NodeExecutionCard key={index} node={node} index={index} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
