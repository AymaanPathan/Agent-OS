/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Play,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Activity,
  TrendingUp,
  BarChart3,
  X,
  Copy,
  Check,
} from "lucide-react";
import {
  getWorkflowHistory,
  getWorkflowDetails,
  deleteWorkflow,
  getWorkspaceStats,
} from "../api/history.api";
import { startRun } from "@/store/slices/runsSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import RunDashboard from "@/components/workflow/Rundashboard";

type WorkflowStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRun: any;
};

type WorkflowItem = {
  _id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
  stats: WorkflowStats;
};

type WorkspaceStats = {
  totalWorkflows: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  runningRuns: number;
  averageDuration: number;
};

const getWorkspaceId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("agentos_workspace");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("agentos_workspace", id);
  }
  return id;
};

export default function HistoryPage({ onClose }: { onClose?: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showRunDashboard, setShowRunDashboard] = useState(false);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getWorkflowHistory(workspaceId);
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to load workflow history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getWorkspaceStats(workspaceId);
      setWorkspaceStats(data.stats);
    } catch (error) {
      console.error("Failed to load workspace stats:", error);
    }
  };

  const handleViewWorkflow = async (workflowId: string) => {
    try {
      const data = await getWorkflowDetails(workflowId);
      setSelectedWorkflow(data.workflow);
      setShowWorkflowDetails(true);
    } catch (error) {
      console.error("Failed to load workflow details:", error);
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const res = await dispatch(startRun({ workflowId })).unwrap();
      setActiveRunId(res.runId);
      setShowRunDashboard(true);
      setShowWorkflowDetails(false);
    } catch (error) {
      console.error("Failed to start workflow:", error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this workflow and all its runs?",
      )
    ) {
      return;
    }

    try {
      await deleteWorkflow(workflowId);
      await loadHistory();
      await loadStats();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (showRunDashboard && activeRunId) {
    return (
      <RunDashboard
        runId={activeRunId}
        onClose={() => {
          setShowRunDashboard(false);
          setActiveRunId(null);
          loadHistory();
          loadStats();
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-[rgb(var(--border))] surface-elevated px-6 py-4 flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:surface transition-colors"
                title="Back to builder"
              >
                <ChevronLeft className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
              </button>
            )}
            <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
              <History className="h-5 w-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <div className="text-base font-bold text-[rgb(var(--foreground))]">
                Workflow History
              </div>
              <div className="text-xs text-[rgb(var(--foreground-muted))]">
                View and manage your workflow executions
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          {workspaceStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatsCard
                icon={Activity}
                label="Total Workflows"
                value={workspaceStats.totalWorkflows}
                color="text-[rgb(var(--primary))]"
                bg="bg-[rgb(var(--primary))]/10"
              />
              <StatsCard
                icon={TrendingUp}
                label="Total Runs"
                value={workspaceStats.totalRuns}
                color="text-[rgb(var(--foreground))]"
                bg="surface"
              />
              <StatsCard
                icon={CheckCircle2}
                label="Successful"
                value={workspaceStats.successfulRuns}
                color="text-[rgb(var(--success))]"
                bg="bg-[rgb(var(--success))]/10"
              />
              <StatsCard
                icon={XCircle}
                label="Failed"
                value={workspaceStats.failedRuns}
                color="text-[rgb(var(--error))]"
                bg="bg-[rgb(var(--error))]/10"
              />
              <StatsCard
                icon={Clock}
                label="Avg Duration"
                value={formatDuration(workspaceStats.averageDuration)}
                color="text-[rgb(var(--warning))]"
                bg="bg-[rgb(var(--warning))]/10"
              />
            </div>
          )}

          {/* Workflows List */}
          {loading ? (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl surface-elevated border border-[rgb(var(--border))] mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Activity className="h-8 w-8 text-[rgb(var(--primary))]" />
                </motion.div>
              </div>
              <p className="text-[rgb(var(--foreground-muted))]">
                Loading workflow history...
              </p>
            </div>
          ) : workflows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl surface-elevated border border-[rgb(var(--border))] mb-6">
                <History className="h-10 w-10 text-[rgb(var(--foreground-subtle))]" />
              </div>
              <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
                No Workflow History
              </h2>
              <p className="text-[rgb(var(--foreground-muted))] mb-6 max-w-md mx-auto">
                You haven&apos;t created any workflows yet. Start building to see
                your history here.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[rgb(var(--foreground))]">
                  Recent Workflows ({workflows.length})
                </h2>
              </div>

              {workflows.map((workflow, index) => (
                <WorkflowCard
                  key={workflow._id}
                  workflow={workflow}
                  index={index}
                  onView={() => handleViewWorkflow(workflow._id)}
                  onRun={() => handleRunWorkflow(workflow._id)}
                  onDelete={() => handleDeleteWorkflow(workflow._id)}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Details Modal */}
      <AnimatePresence>
        {showWorkflowDetails && selectedWorkflow && (
          <WorkflowDetailsModal
            workflow={selectedWorkflow}
            onClose={() => {
              setShowWorkflowDetails(false);
              setSelectedWorkflow(null);
            }}
            onRun={() => handleRunWorkflow(selectedWorkflow._id)}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl ${bg} border border-[rgb(var(--border))] p-4`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${bg} border border-[rgb(var(--border))]`}
        >
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <div className="text-xs text-[rgb(var(--foreground-muted))]">
            {label}
          </div>
          <div className={`text-xl font-bold ${color}`}>{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function WorkflowCard({
  workflow,
  index,
  onView,
  onRun,
  onDelete,
  formatDate,
  formatDuration,
}: any) {
  const successRate =
    workflow.stats.totalRuns > 0
      ? Math.round(
          (workflow.stats.successfulRuns / workflow.stats.totalRuns) * 100,
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-[rgb(var(--border))] surface-elevated overflow-hidden hover:border-[rgb(var(--border-subtle))] transition-all group"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-[rgb(var(--foreground))] truncate">
                {workflow.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full surface text-[rgb(var(--foreground-muted))] border border-[rgb(var(--border))]">
                {workflow.nodes.length} steps
              </span>
            </div>

            {workflow.description && (
              <p className="text-sm text-[rgb(var(--foreground-muted))] mb-3 line-clamp-2">
                {workflow.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-[rgb(var(--foreground-muted))]">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(workflow.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>{workflow.stats.totalRuns} runs</span>
              </div>
              {workflow.stats.totalRuns > 0 && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>{successRate}% success rate</span>
                </div>
              )}
            </div>

            {workflow.stats.lastRun && (
              <div className="mt-3 p-2.5 rounded-lg surface border border-[rgb(var(--border))]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[rgb(var(--foreground-muted))]">
                      Last run:
                    </span>
                    <StatusBadge status={workflow.stats.lastRun.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[rgb(var(--foreground-muted))]">
                    <span>{formatDate(workflow.stats.lastRun.startedAt)}</span>
                    {workflow.stats.lastRun.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(workflow.stats.lastRun.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onView}
              className="p-2 rounded-lg surface hover:bg-[rgb(var(--border))] transition-colors"
              title="View details"
            >
              <Eye className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            </button>
            <button
              onClick={onRun}
              className="px-3 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg surface hover:bg-[rgb(var(--error))]/10 transition-colors"
              title="Delete workflow"
            >
              <Trash2 className="h-4 w-4 text-[rgb(var(--error))]" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    success: {
      icon: CheckCircle2,
      text: "Success",
      color: "text-[rgb(var(--success))]",
      bg: "bg-[rgb(var(--success))]/10",
      border: "border-[rgb(var(--success))]/20",
    },
    failed: {
      icon: XCircle,
      text: "Failed",
      color: "text-[rgb(var(--error))]",
      bg: "bg-[rgb(var(--error))]/10",
      border: "border-[rgb(var(--error))]/20",
    },
    running: {
      icon: Activity,
      text: "Running",
      color: "text-[rgb(var(--warning))]",
      bg: "bg-[rgb(var(--warning))]/10",
      border: "border-[rgb(var(--warning))]/20",
    },
    paused: {
      icon: AlertCircle,
      text: "Paused",
      color: "text-[rgb(var(--foreground-muted))]",
      bg: "surface",
      border: "border-[rgb(var(--border))]",
    },
  }[status] || {
    icon: AlertCircle,
    text: status,
    color: "text-[rgb(var(--foreground-muted))]",
    bg: "surface",
    border: "border-[rgb(var(--border))]",
  };

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.border} border`}
    >
      <Icon className={`h-3 w-3 ${config.color}`} />
      <span className={`text-[10px] font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}

function WorkflowDetailsModal({
  workflow = null,
  onClose,
  onRun,
  formatDate,
  formatDuration,
}: any) {
  const [copiedConfig, setCopiedConfig] = useState(false);

  const copyConfig = () => {
    const config = JSON.stringify(
      { nodes: workflow.nodes, edges: workflow.edges },
      null,
      2,
    );
    navigator.clipboard.writeText(config);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[rgb(var(--border))] surface-elevated shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-[rgb(var(--border))] p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[rgb(var(--foreground))] mb-2">
                {workflow?.name}
              </h2>
              {workflow?.description && (
                <p className="text-sm text-[rgb(var(--foreground-muted))]">
                  {workflow?.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-[rgb(var(--foreground-muted))]">
                <span>{workflow?.nodes?.length} steps</span>
                <span>•</span>
                <span>Created {formatDate(workflow?.createdAt)}</span>
                <span>•</span>
                <span>{workflow?.stats?.totalRuns} total runs</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg surface hover:bg-[rgb(var(--border))] transition-colors"
            >
              <X className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Workflow Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                Workflow Steps
              </h3>
              <button
                onClick={copyConfig}
                className="text-xs px-3 py-1.5 rounded-lg surface hover:bg-[rgb(var(--border))] transition-colors flex items-center gap-1.5"
              >
                {copiedConfig ? (
                  <>
                    <Check className="h-3 w-3 text-[rgb(var(--success))]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Config
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {workflow?.nodes?.map((node: any, index: number) => (
                <div
                  key={node.id}
                  className="rounded-lg border border-[rgb(var(--border))] surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md surface border border-[rgb(var(--border))] flex items-center justify-center">
                      <span className="text-xs font-semibold text-[rgb(var(--foreground-muted))]">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[rgb(var(--foreground))]">
                        {node?.data?.label || "Unnamed Step"}
                      </div>
                      {node?.data?.desc && (
                        <div className="text-xs text-[rgb(var(--foreground-muted))] mt-0.5">
                          {node?.data?.desc}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[rgb(var(--foreground-subtle))]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Runs */}
          {workflow?.recentRuns && workflow?.recentRuns?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--foreground))] mb-4">
                Recent Runs ({workflow?.recentRuns?.length})
              </h3>
              <div className="space-y-2">
                {workflow?.recentRuns?.map((run: any) => (
                  <div
                    key={run?._id}
                    className="rounded-lg border border-[rgb(var(--border))] surface p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={run?.status} />
                        <span className="text-xs text-[rgb(var(--foreground-muted))]">
                          {formatDate(run?.startedAt)}
                        </span>
                      </div>
                      {run?.duration && (
                        <div className="flex items-center gap-1 text-xs text-[rgb(var(--foreground-muted))]">
                          <Clock className="h-3 w-3" />
                          {formatDuration(run?.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[rgb(var(--border))] p-6 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg surface hover:bg-[rgb(var(--border))] text-sm font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRun}
            className="px-6 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run Workflow
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
