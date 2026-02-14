/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Terminal,
  Clock,
  Activity,
  Shield,
  Zap,
  AlertCircle,
  TrendingUp,
  Server,
  BarChart3,
  Cpu,
  Container as ContainerIcon,
  PlayCircle,
  Eye,
  EyeOff,
  Target,
  ListChecks,
  ArrowRight,
} from "lucide-react";

interface SwarmExecutionPanelProps {
  executionId: string;
  goal: string;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    icon: any;
    color: string;
  }>;
  safetyOptions: Array<{
    id: string;
    label: string;
    enabled: boolean;
  }>;
}

interface AgentMessage {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
  data?: any;
}

interface AgentStatus {
  agentId: string;
  status: "pending" | "running" | "success" | "error";
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export default function SwarmExecutionPanel({
  executionId,
  goal,
  agents,
  safetyOptions,
}: SwarmExecutionPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, AgentStatus>
  >({});
  const [isComplete, setIsComplete] = useState(false);
  const [overallStatus, setOverallStatus] = useState<
    "running" | "success" | "error"
  >("running");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const initialStatuses: Record<string, AgentStatus> = {};
    agents.forEach((agent) => {
      initialStatuses[agent.id] = { agentId: agent.id, status: "pending" };
    });
    setAgentStatuses(initialStatuses);
    executeSwarm();

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const executeSwarm = async () => {
    try {
      addMessage({
        agentId: "system",
        agentName: "System",
        type: "info",
        message: `🚀 Starting agent swarm execution`,
      });

      const response = await fetch(
        "http://localhost:9000/v1/a2a/b0141140-90fc-4e81-80e9-24f3017ce67a",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer archestra_0408acd7a2e3a6c5d7057ccfdef407b0",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "message/send",
            params: {
              message: {
                parts: [{ kind: "text", text: goal }],
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("🔍 Full API Response:", data);

      if (data.result) {
        updateAgentStatus("incident-commander", "running");
        addMessage({
          agentId: "incident-commander",
          agentName: "Incident Commander",
          type: "info",
          message: "🔍 Processing incident...",
        });

        // Extract the text from the response
        const responseText = data.result.parts?.[0]?.text || "";
        console.log("📄 Response Text:", responseText);

        let parsedResponse: any = null;

        try {
          // Clean the response text - remove any extra whitespace/newlines
          const cleanedText = responseText.trim();

          if (!cleanedText) {
            throw new Error("Response text is empty");
          }

          // Parse the JSON
          parsedResponse = JSON.parse(cleanedText);
          console.log("✅ Parsed Response:", parsedResponse);

          // Verify we have the required data
          if (!parsedResponse.incident_id) {
            console.warn(
              "⚠️ Response missing incident_id, using default structure",
            );
            parsedResponse = {
              incident_id: "INC-UNKNOWN",
              timestamp: new Date().toISOString(),
              severity: "unknown",
              summary: "Unable to parse incident data",
              investigation_findings: {
                health_status: {
                  total_containers: 0,
                  healthy: 0,
                  unhealthy: 0,
                  critical_services: [],
                },
                log_analysis: {
                  error_count: 0,
                  critical_errors: [],
                  error_timeline: [],
                },
                root_cause: {
                  primary_cause: "Unable to determine",
                  contributing_factors: [],
                  affected_components: [],
                },
              },
              recommended_actions: [],
              risk_assessment: {
                overall_risk_score: 0,
                blast_radius: "unknown",
                affected_users: "unknown",
                business_impact: "Unable to assess",
              },
              next_steps: [],
            };
          }
        } catch (e) {
          console.error("❌ Failed to parse response:", e);
          console.log("Raw response text:", responseText);

          // Set error state with fallback data
          parsedResponse = {
            incident_id: "INC-ERROR",
            timestamp: new Date().toISOString(),
            severity: "high",
            summary: "Error parsing API response",
            investigation_findings: {
              health_status: {
                total_containers: 0,
                healthy: 0,
                unhealthy: 0,
                critical_services: [],
              },
              log_analysis: {
                error_count: 0,
                critical_errors: ["Failed to parse API response"],
                error_timeline: [],
              },
              root_cause: {
                primary_cause: "API response parsing error",
                contributing_factors: ["Invalid JSON format", "Network issues"],
                affected_components: [],
              },
            },
            recommended_actions: [],
            risk_assessment: {
              overall_risk_score: 5,
              blast_radius: "unknown",
              affected_users: "unknown",
              business_impact: "Cannot assess - parsing error",
            },
            next_steps: [
              "Check API response format",
              "Verify network connectivity",
            ],
            error: String(e),
            rawResponse: responseText,
          };
        }

        await simulateAgentFlow(parsedResponse);
        setDashboardData(parsedResponse);
        setOverallStatus("success");
        setIsComplete(true);

        addMessage({
          agentId: "system",
          agentName: "System",
          type: "success",
          message: "✅ Investigation complete",
        });
      } else {
        throw new Error("No result in API response");
      }
    } catch (error: any) {
      console.error("Swarm execution error:", error);
      setOverallStatus("error");
      setIsComplete(true);

      addMessage({
        agentId: "system",
        agentName: "System",
        type: "error",
        message: `❌ Execution failed: ${error.message}`,
      });

      // Set fallback data even on error so dashboard can display something
      setDashboardData({
        incident_id: "INC-FAILED",
        timestamp: new Date().toISOString(),
        severity: "critical",
        summary: `Execution failed: ${error.message}`,
        investigation_findings: {
          health_status: {
            total_containers: 0,
            healthy: 0,
            unhealthy: 0,
            critical_services: [],
          },
          log_analysis: {
            error_count: 1,
            critical_errors: [error.message],
            error_timeline: [],
          },
          root_cause: {
            primary_cause: "Agent swarm execution failed",
            contributing_factors: [error.message],
            affected_components: [],
          },
        },
        recommended_actions: [],
        risk_assessment: {
          overall_risk_score: 10,
          blast_radius: "unknown",
          affected_users: "unknown",
          business_impact: "System unavailable for analysis",
        },
        next_steps: [
          "Check API connectivity",
          "Verify authentication",
          "Review error logs",
        ],
      });
    }
  };

  const simulateAgentFlow = async (parsedData: any) => {
    // Incident Commander
    await delay(1000);
    updateAgentStatus("incident-commander", "success");
    addMessage({
      agentId: "incident-commander",
      agentName: "Incident Commander",
      type: "success",
      message: `📊 Incident ${parsedData.incident_id} - ${parsedData.severity?.toUpperCase()} severity detected`,
    });

    // Log Detective
    if (agents.find((a) => a.id === "log-detective")) {
      await delay(500);
      updateAgentStatus("log-detective", "running");
      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type: "info",
        message: "🔎 Analyzing logs...",
      });

      await delay(2000);
      updateAgentStatus("log-detective", "success");
      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type: "warning",
        message: `🎯 Found ${parsedData.investigation_findings?.log_analysis?.error_count || 0} errors - Root cause identified`,
      });
    }

    // Recovery Strategist
    if (agents.find((a) => a.id === "recovery-strategist")) {
      await delay(500);
      updateAgentStatus("recovery-strategist", "running");
      addMessage({
        agentId: "recovery-strategist",
        agentName: "Recovery Strategist",
        type: "info",
        message: "⚡ Generating recovery strategies...",
      });

      await delay(1500);
      updateAgentStatus("recovery-strategist", "success");
      addMessage({
        agentId: "recovery-strategist",
        agentName: "Recovery Strategist",
        type: "success",
        message: `💡 ${parsedData.recommended_actions?.length || 0} recovery actions identified`,
      });
    }

    // Risk Checker
    if (agents.find((a) => a.id === "risk-checker")) {
      await delay(500);
      updateAgentStatus("risk-checker", "running");
      addMessage({
        agentId: "risk-checker",
        agentName: "Risk Checker",
        type: "info",
        message: "🛡️ Evaluating risk...",
      });

      await delay(1000);
      updateAgentStatus("risk-checker", "success");
      addMessage({
        agentId: "risk-checker",
        agentName: "Risk Checker",
        type: "success",
        message: `✅ Risk score: ${parsedData.risk_assessment?.overall_risk_score || 0}/10 - ${parsedData.risk_assessment?.blast_radius || "unknown"} blast radius`,
      });
    }
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const addMessage = (msg: Omit<AgentMessage, "id" | "timestamp">) => {
    const newMessage: AgentMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const updateAgentStatus = (
    agentId: string,
    status: AgentStatus["status"],
  ) => {
    setAgentStatuses((prev) => {
      const current = prev[agentId] || { agentId, status: "pending" };
      const updated: AgentStatus = { ...current, status };

      if (status === "running" && !current.startTime) {
        updated.startTime = new Date().toISOString();
      }

      if ((status === "success" || status === "error") && !current.endTime) {
        updated.endTime = new Date().toISOString();
        if (current.startTime) {
          updated.duration = Date.now() - new Date(current.startTime).getTime();
        }
      }

      return { ...prev, [agentId]: updated };
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  };

  const getStatusIcon = (status: AgentStatus["status"]) => {
    switch (status) {
      case "running":
        return (
          <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--primary))]" />
        );
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />;
      case "error":
        return <XCircle className="h-4 w-4 text-[rgb(var(--error))]" />;
      default:
        return (
          <div className="h-4 w-4 rounded-full border-2 border-[rgb(var(--border))]" />
        );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "text-[rgb(var(--error))] bg-[rgb(var(--error))]/10 border-[rgb(var(--error))]/20";
      case "high":
        return "text-[rgb(var(--error))] bg-[rgb(var(--error))]/10 border-[rgb(var(--error))]/20";
      case "medium":
        return "text-[rgb(var(--warning))] bg-[rgb(var(--warning))]/10 border-[rgb(var(--warning))]/20";
      default:
        return "text-[rgb(var(--success))] bg-[rgb(var(--success))]/10 border-[rgb(var(--success))]/20";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return "text-[rgb(var(--error))] bg-[rgb(var(--error))]/10";
    if (score >= 5)
      return "text-[rgb(var(--warning))] bg-[rgb(var(--warning))]/10";
    return "text-[rgb(var(--success))] bg-[rgb(var(--success))]/10";
  };

  const getRiskBarColor = (score: number) => {
    if (score >= 8) return "bg-[rgb(var(--error))]";
    if (score >= 5) return "bg-[rgb(var(--warning))]";
    return "bg-[rgb(var(--success))]";
  };

  // Extract data safely with fallbacks
  const incidentId = dashboardData?.incident_id || "N/A";
  const timestamp = dashboardData?.timestamp || new Date().toISOString();
  const severity = dashboardData?.severity || "unknown";
  const summary = dashboardData?.summary || "No summary available";

  const healthStatus = dashboardData?.investigation_findings?.health_status || {
    total_containers: 0,
    healthy: 0,
    unhealthy: 0,
    critical_services: [],
  };

  const logAnalysis = dashboardData?.investigation_findings?.log_analysis || {
    error_count: 0,
    critical_errors: [],
    error_timeline: [],
  };

  const rootCause = dashboardData?.investigation_findings?.root_cause || {
    primary_cause: "",
    contributing_factors: [],
    affected_components: [],
  };

  const recommendedActions = dashboardData?.recommended_actions || [];
  const riskAssessment = dashboardData?.risk_assessment || {
    overall_risk_score: 0,
    blast_radius: "unknown",
    affected_users: "unknown",
    business_impact: "No assessment available",
  };
  const nextSteps = dashboardData?.next_steps || [];

  if (!dashboardData && isComplete) {
    return (
      <div className="h-full flex items-center justify-center bg-[rgb(var(--background))]">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-[rgb(var(--warning))] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[rgb(var(--foreground))] mb-2">
            No data available
          </h3>
          <p className="text-sm text-[rgb(var(--foreground-muted))]">
            The investigation completed but no data was returned
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] surface-elevated px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overallStatus === "running" && (
              <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--primary))]" />
            )}
            {overallStatus === "success" && (
              <CheckCircle2 className="h-6 w-6 text-[rgb(var(--success))]" />
            )}
            {overallStatus === "error" && (
              <XCircle className="h-6 w-6 text-[rgb(var(--error))]" />
            )}
            <div>
              <div className="text-lg font-bold text-[rgb(var(--foreground))]">
                {overallStatus === "running" && "Executing Agent Swarm..."}
                {overallStatus === "success" && "Investigation Complete"}
                {overallStatus === "error" && "Execution Failed"}
              </div>
              <div className="flex items-center gap-3 text-sm text-[rgb(var(--foreground-muted))]">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(elapsedTime)}</span>
                </div>
                {isComplete && (
                  <>
                    <div className="h-1 w-1 rounded-full bg-[rgb(var(--border))]" />
                    <span className="font-mono">{incidentId}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-4 py-2 rounded-lg border border-[rgb(var(--border))] hover:surface-elevated text-sm font-medium text-[rgb(var(--foreground))] transition-colors flex items-center gap-2"
          >
            {showLogs ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showLogs ? "Hide" : "Show"} Activity
          </button>
        </div>

        {/* Agent Progress Bar */}
        <div className="mt-4 flex items-center gap-2">
          {agents.map((agent, index) => {
            const status = agentStatuses[agent.id];
            return (
              <div key={agent.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex-1 h-2 rounded-full transition-all ${
                    status?.status === "success"
                      ? "bg-[rgb(var(--success))]"
                      : status?.status === "running"
                        ? "bg-[rgb(var(--primary))] animate-pulse"
                        : status?.status === "error"
                          ? "bg-[rgb(var(--error))]"
                          : "bg-[rgb(var(--border))]"
                  }`}
                />
                {index < agents.length - 1 && (
                  <div className="h-2 w-2 rounded-full bg-[rgb(var(--border))]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!isComplete ? (
          // Loading State
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-16 w-16 animate-spin text-[rgb(var(--primary))] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[rgb(var(--foreground))] mb-2">
                Agents are investigating...
              </h3>
              <p className="text-sm text-[rgb(var(--foreground-muted))]">
                {messages[messages.length - 1]?.message || "Processing..."}
              </p>
            </div>
          </div>
        ) : (
          // Dashboard View
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Incident Header Card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getSeverityColor(severity)}`}
                      >
                        {severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-[rgb(var(--foreground-subtle))]">
                        {new Date(timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
                      {summary}
                    </h2>
                    <p className="text-sm text-[rgb(var(--foreground-muted))]">
                      Incident ID:{" "}
                      <span className="font-mono font-semibold">
                        {incidentId}
                      </span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
                    <AlertCircle className="h-8 w-8 text-[rgb(var(--primary))]" />
                  </div>
                </div>
              </motion.div>

              {/* Health Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-lg bg-[rgb(var(--primary))]/10">
                      <Server className="h-6 w-6 text-[rgb(var(--primary))]" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[rgb(var(--foreground))] mb-1">
                    {healthStatus.total_containers || 0}
                  </div>
                  <div className="text-sm text-[rgb(var(--foreground-muted))]">
                    Total Containers
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-lg bg-[rgb(var(--success))]/10">
                      <CheckCircle2 className="h-6 w-6 text-[rgb(var(--success))]" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[rgb(var(--success))] mb-1">
                    {healthStatus.healthy || 0}
                  </div>
                  <div className="text-sm text-[rgb(var(--foreground-muted))]">
                    Healthy
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-lg bg-[rgb(var(--error))]/10">
                      <XCircle className="h-6 w-6 text-[rgb(var(--error))]" />
                    </div>
                    {(healthStatus.unhealthy || 0) > 0 && (
                      <div className="h-2 w-2 rounded-full bg-[rgb(var(--error))] animate-pulse" />
                    )}
                  </div>
                  <div className="text-3xl font-bold text-[rgb(var(--error))] mb-1">
                    {healthStatus.unhealthy || 0}
                  </div>
                  <div className="text-sm text-[rgb(var(--foreground-muted))]">
                    Unhealthy
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-lg bg-[rgb(var(--warning))]/10">
                      <AlertTriangle className="h-6 w-6 text-[rgb(var(--warning))]" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[rgb(var(--error))] mb-1">
                    {logAnalysis.error_count || 0}
                  </div>
                  <div className="text-sm text-[rgb(var(--foreground-muted))]">
                    Total Errors
                  </div>
                </motion.div>
              </div>

              {/* Critical Services */}
              {healthStatus.critical_services &&
                healthStatus.critical_services.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-xl border border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/5 p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-[rgb(var(--error))]/20">
                        <ContainerIcon className="h-5 w-5 text-[rgb(var(--error))]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                        Critical Services
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {healthStatus.critical_services.map(
                        (service: string, idx: number) => (
                          <div
                            key={idx}
                            className="px-4 py-2 rounded-lg bg-[rgb(var(--error))]/10 border border-[rgb(var(--error))]/20 font-mono text-sm font-semibold text-[rgb(var(--error))]"
                          >
                            {service}
                          </div>
                        ),
                      )}
                    </div>
                  </motion.div>
                )}

              {/* Log Analysis & Root Cause */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Log Analysis */}
                {logAnalysis.critical_errors && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-[rgb(var(--warning))]/10">
                        <Terminal className="h-5 w-5 text-[rgb(var(--warning))]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                        Log Analysis
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Critical Errors */}
                      <div>
                        <div className="text-xs font-semibold text-[rgb(var(--foreground-subtle))] mb-2">
                          CRITICAL ERRORS
                        </div>
                        <div className="space-y-2">
                          {logAnalysis.critical_errors.map(
                            (error: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 p-3 rounded-lg bg-[rgb(var(--error))]/5 border border-[rgb(var(--error))]/10"
                              >
                                <AlertCircle className="h-4 w-4 text-[rgb(var(--error))] flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-[rgb(var(--foreground))]">
                                  {error}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Error Timeline */}
                      {logAnalysis.error_timeline &&
                        logAnalysis.error_timeline.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-[rgb(var(--foreground-subtle))] mb-2">
                              ERROR TIMELINE
                            </div>
                            <div className="space-y-1">
                              {logAnalysis.error_timeline.map(
                                (entry: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-[rgb(var(--foreground-muted))] font-mono bg-[rgb(var(--surface))] px-3 py-2 rounded border border-[rgb(var(--border))]"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />
                                    {entry}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}

                {/* Root Cause */}
                {rootCause.primary_cause && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                        <Target className="h-5 w-5 text-[rgb(var(--primary))]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                        Root Cause
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Primary Cause */}
                      <div className="p-4 rounded-lg bg-[rgb(var(--primary))]/5 border border-[rgb(var(--primary))]/10">
                        <div className="text-xs font-semibold text-[rgb(var(--primary))] mb-2">
                          PRIMARY CAUSE
                        </div>
                        <p className="text-sm text-[rgb(var(--foreground))] leading-relaxed">
                          {rootCause.primary_cause}
                        </p>
                      </div>

                      {/* Contributing Factors */}
                      {rootCause.contributing_factors &&
                        rootCause.contributing_factors.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-[rgb(var(--foreground-subtle))] mb-2">
                              CONTRIBUTING FACTORS
                            </div>
                            <div className="space-y-2">
                              {rootCause.contributing_factors.map(
                                (factor: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 text-sm text-[rgb(var(--foreground-muted))] bg-[rgb(var(--surface))] px-3 py-2 rounded border border-[rgb(var(--border))]"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--warning))] mt-1.5 flex-shrink-0" />
                                    <span>{factor}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Affected Components */}
                      {rootCause.affected_components &&
                        rootCause.affected_components.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-[rgb(var(--foreground-subtle))] mb-2">
                              AFFECTED COMPONENTS
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {rootCause.affected_components.map(
                                (component: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-lg bg-[rgb(var(--error))]/10 text-xs font-mono font-semibold text-[rgb(var(--error))] border border-[rgb(var(--error))]/20"
                                  >
                                    {component}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Recommended Actions */}
              {recommendedActions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-[rgb(var(--success))]/10">
                      <Zap className="h-5 w-5 text-[rgb(var(--success))]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                      Recommended Actions
                    </h3>
                    <span className="ml-auto text-sm text-[rgb(var(--foreground-muted))]">
                      {recommendedActions.length} action
                      {recommendedActions.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {recommendedActions.map((action: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-5 rounded-xl border ${
                          action.risk_level === "low"
                            ? "border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/5"
                            : action.risk_level === "medium"
                              ? "border-[rgb(var(--warning))]/20 bg-[rgb(var(--warning))]/5"
                              : "border-[rgb(var(--error))]/20 bg-[rgb(var(--error))]/5"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Step Number */}
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 flex-shrink-0">
                            <span className="text-lg font-bold text-[rgb(var(--primary))]">
                              {action.execution_order}
                            </span>
                          </div>

                          <div className="flex-1">
                            {/* Action Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <h4 className="text-base font-semibold text-[rgb(var(--foreground))] mb-1">
                                  {action.action}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-[rgb(var(--foreground-muted))]">
                                  <span className="font-mono">
                                    {action.action_id}
                                  </span>
                                  <span>•</span>
                                  <span>Target: {action.target}</span>
                                </div>
                              </div>
                              {action.requires_approval && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))] border border-[rgb(var(--warning))]/20 flex-shrink-0">
                                  Approval Required
                                </span>
                              )}
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="text-center p-2 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
                                <div className="text-xs text-[rgb(var(--foreground-subtle))] mb-1">
                                  Risk
                                </div>
                                <div
                                  className={`text-sm font-bold capitalize ${
                                    action.risk_level === "low"
                                      ? "text-[rgb(var(--success))]"
                                      : action.risk_level === "medium"
                                        ? "text-[rgb(var(--warning))]"
                                        : "text-[rgb(var(--error))]"
                                  }`}
                                >
                                  {action.risk_level}
                                </div>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
                                <div className="text-xs text-[rgb(var(--foreground-subtle))] mb-1">
                                  Downtime
                                </div>
                                <div className="text-sm font-bold text-[rgb(var(--foreground))]">
                                  {action.estimated_downtime}
                                </div>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
                                <div className="text-xs text-[rgb(var(--foreground-subtle))] mb-1">
                                  Tool
                                </div>
                                <div className="text-[10px] font-mono font-bold text-[rgb(var(--primary))] truncate">
                                  {action.tool.split("__")[1]}
                                </div>
                              </div>
                            </div>

                            {/* Impact */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
                              <AlertCircle className="h-4 w-4 text-[rgb(var(--primary))] flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                                <span className="font-semibold text-[rgb(var(--foreground))]">
                                  Impact:
                                </span>{" "}
                                {action.estimated_impact}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Risk Assessment & Next Steps */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Assessment */}
                {riskAssessment.overall_risk_score && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                        <Shield className="h-5 w-5 text-[rgb(var(--primary))]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                        Risk Assessment
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Risk Score */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[rgb(var(--foreground-subtle))]">
                            Overall Risk Score
                          </span>
                          <span
                            className={`text-2xl font-bold ${getRiskColor(riskAssessment.overall_risk_score)}`}
                          >
                            {riskAssessment.overall_risk_score}/10
                          </span>
                        </div>
                        <div className="h-3 bg-[rgb(var(--border))] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getRiskBarColor(riskAssessment.overall_risk_score)}`}
                            style={{
                              width: `${riskAssessment.overall_risk_score * 10}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 pt-3 border-t border-[rgb(var(--border))]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[rgb(var(--foreground-subtle))]">
                            Blast Radius
                          </span>
                          <span className="font-semibold text-[rgb(var(--foreground))] capitalize">
                            {riskAssessment.blast_radius}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[rgb(var(--foreground-subtle))]">
                            Affected Users
                          </span>
                          <span className="font-semibold text-[rgb(var(--foreground))]">
                            {riskAssessment.affected_users}
                          </span>
                        </div>
                      </div>

                      {/* Business Impact */}
                      {riskAssessment.business_impact && (
                        <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
                          <div className="text-xs font-semibold text-[rgb(var(--foreground-subtle))] mb-2">
                            BUSINESS IMPACT
                          </div>
                          <p className="text-sm text-[rgb(var(--foreground-muted))] leading-relaxed">
                            {riskAssessment.business_impact}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Next Steps */}
                {nextSteps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                    className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                        <ListChecks className="h-5 w-5 text-[rgb(var(--primary))]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                        Next Steps
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {nextSteps.map((step: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] hover:surface-elevated transition-colors group"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 flex-shrink-0">
                            <span className="text-xs font-bold text-[rgb(var(--primary))]">
                              {idx + 1}
                            </span>
                          </div>
                          <p className="text-sm text-[rgb(var(--foreground-muted))] leading-relaxed group-hover:text-[rgb(var(--foreground))] transition-colors">
                            {step}
                          </p>
                          <ArrowRight className="h-4 w-4 text-[rgb(var(--foreground-subtle))] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Log Sidebar */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 border-l border-[rgb(var(--border))] surface-elevated shadow-2xl z-50"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-[rgb(var(--border))]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[rgb(var(--foreground))]">
                      Activity Log
                    </h3>
                    <button
                      onClick={() => setShowLogs(false)}
                      className="p-2 rounded-lg hover:surface transition-colors"
                    >
                      <XCircle className="h-5 w-5 text-[rgb(var(--foreground-muted))]" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 rounded-lg border border-[rgb(var(--border))] surface"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                          {message.agentName}
                        </span>
                        <span className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-[rgb(var(--foreground-muted))]">
                        {message.message}
                      </p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
