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
  ChevronRight,
  Terminal,
  Clock,
  Activity,
  FileText,
  Shield,
  Zap,
  AlertCircle,
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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [isComplete, setIsComplete] = useState(false);
  const [overallStatus, setOverallStatus] = useState<
    "running" | "success" | "error"
  >("running");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Initialize agent statuses
    const initialStatuses: Record<string, AgentStatus> = {};
    agents.forEach((agent) => {
      initialStatuses[agent.id] = {
        agentId: agent.id,
        status: "pending",
      };
    });
    setAgentStatuses(initialStatuses);

    // Start swarm execution
    executeSwarm();

    // Elapsed time counter
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
      // Add initial message
      addMessage({
        agentId: "system",
        agentName: "System",
        type: "info",
        message: `Starting agent swarm execution for goal: "${goal}"`,
      });

      // Call the main agent API
      const response = await fetch(
        "http://localhost:9000/v1/a2a/333c740d-7abe-4c8e-b624-17f7dc4beb46",
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
                parts: [
                  {
                    kind: "text",
                    text: goal,
                  },
                ],
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Process the response
      if (data.result) {
        // Update agent statuses based on response
        updateAgentStatus("incident-commander", "running");

        addMessage({
          agentId: "incident-commander",
          agentName: "Incident Commander",
          type: "info",
          message: "Processing incident and coordinating response...",
        });

        // Parse the response
        const responseText =
          data.result.parts?.[0]?.text || JSON.stringify(data.result);

        // Parse the structured JSON from the response
        let parsedResponse: any = {};
        try {
          // The response contains multiple JSON objects, extract the final comprehensive one
          const jsonMatches = responseText.match(/\{[\s\S]*?\}(?=\n|$)/g);
          if (jsonMatches && jsonMatches.length > 0) {
            // Take the last (most comprehensive) JSON object
            parsedResponse = JSON.parse(jsonMatches[jsonMatches.length - 1]);
          }
        } catch (e) {
          console.error("Failed to parse response:", e);
          parsedResponse = { rawResponse: responseText };
        }

        // Simulate agent coordination based on response
        await simulateAgentFlow(parsedResponse, responseText);

        setOverallStatus("success");
        setIsComplete(true);

        addMessage({
          agentId: "system",
          agentName: "System",
          type: "success",
          message: "Swarm execution completed successfully",
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
        message: `Execution failed: ${error.message}`,
      });

      // Mark all pending agents as error
      Object.keys(agentStatuses).forEach((agentId) => {
        if (agentStatuses[agentId].status === "pending") {
          updateAgentStatus(agentId, "error");
        }
      });
    }
  };

  const simulateAgentFlow = async (parsedData: any, fullResponse: string) => {
    // Incident Commander (already running)
    await delay(1000);
    updateAgentStatus("incident-commander", "success");

    const initialAssessment = parsedData.initialAssessment || {};
    const incidentReport = parsedData.incidentReport || {};

    let commanderMsg = "Initial assessment complete.";
    if (incidentReport.containerName) {
      const symptoms =
        incidentReport.symptoms?.join(", ") || "Unknown symptoms";
      commanderMsg = `Incident detected in container '${incidentReport.containerName}': ${symptoms}`;
    } else if (initialAssessment.dockerList) {
      commanderMsg = `Found ${initialAssessment.dockerList.totalCount} containers: ${initialAssessment.dockerList.healthyCount} healthy, ${initialAssessment.dockerList.unhealthyCount || 0} unhealthy`;
    }

    addMessage({
      agentId: "incident-commander",
      agentName: "Incident Commander",
      type: "success",
      message: commanderMsg,
      data: {
        incidentReport: parsedData.incidentReport,
        dockerList: initialAssessment.dockerList,
        healthCheckScan: initialAssessment.healthCheckScan,
      },
    });

    // Log Detective
    if (agents.find((a) => a.id === "log-detective")) {
      await delay(500);
      updateAgentStatus("log-detective", "running");
      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type: "info",
        message: "Analyzing container logs and diagnostics...",
      });

      await delay(2000);
      updateAgentStatus("log-detective", "success");

      const diagnostic = parsedData.diagnosticResult || {};
      const rootCauseMsg =
        diagnostic.rootCause || "Root cause analysis complete";
      const severity = diagnostic.severity
        ? ` (Severity: ${diagnostic.severity.toUpperCase()})`
        : "";

      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type:
          diagnostic.severity === "high" || diagnostic.severity === "critical"
            ? "warning"
            : "success",
        message: `${rootCauseMsg}${severity}`,
        data: parsedData.diagnosticResult,
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
        message: "Generating and evaluating recovery strategies...",
      });

      await delay(1500);
      updateAgentStatus("recovery-strategist", "success");

      const strategy = parsedData.strategyResult?.selectedOption || {};
      let strategyMsg = "Recovery strategy recommended";

      if (strategy.description) {
        strategyMsg = strategy.description;
        if (strategy.estimatedDowntime) {
          strategyMsg += ` (Downtime: ${strategy.estimatedDowntime})`;
        }
      }

      addMessage({
        agentId: "recovery-strategist",
        agentName: "Recovery Strategist",
        type: "success",
        message: strategyMsg,
        data: parsedData.strategyResult,
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
        message: "Evaluating risk and approval requirements...",
      });

      await delay(1000);
      const riskCheck = parsedData.riskCheckResult || {};
      const needsApproval = riskCheck.requiresHumanApproval || false;
      const approved = riskCheck.approval === "approved";

      let riskMsg = "Action evaluation complete";
      if (needsApproval) {
        riskMsg = "⚠️ Action requires human approval";
      } else if (approved) {
        riskMsg = "✅ Action approved - risk within acceptable thresholds";
        if (riskCheck.riskNotes) {
          riskMsg += `. ${riskCheck.riskNotes}`;
        }
      }

      updateAgentStatus("risk-checker", "success");
      addMessage({
        agentId: "risk-checker",
        agentName: "Risk Checker",
        type: needsApproval ? "warning" : "success",
        message: riskMsg,
        data: parsedData.riskCheckResult,
      });
    }

    // Final Decision
    await delay(500);
    const finalDecision = parsedData.finalDecision || {};
    let summaryMsg = "All agents have completed their tasks";

    if (finalDecision.action === "execute") {
      summaryMsg = `✅ Final Decision: ${finalDecision.action.toUpperCase()}`;
      if (finalDecision.notes) {
        summaryMsg += ` - ${finalDecision.notes}`;
      }
      if (finalDecision.confidenceScore) {
        summaryMsg += ` (Confidence: ${Math.round(finalDecision.confidenceScore * 100)}%)`;
      }
    }

    addMessage({
      agentId: "system",
      agentName: "System",
      type: "success",
      message: summaryMsg,
      data: parsedData.finalDecision,
    });
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

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
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

  const getMessageIcon = (type: AgentMessage["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />;
      case "error":
        return <XCircle className="h-4 w-4 text-[rgb(var(--error))]" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />;
      default:
        return <Activity className="h-4 w-4 text-[rgb(var(--primary))]" />;
    }
  };

  // Improved data rendering function
  const renderDataSection = (data: any) => {
    if (!data || typeof data !== "object") {
      return (
        <pre className="text-xs text-[rgb(var(--foreground-muted))] bg-[rgb(var(--surface))] p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    }

    // Render structured sections for different data types
    return (
      <div className="space-y-3">
        {/* Incident Report */}
        {data.incidentReport && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-[rgb(var(--warning))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Incident Report
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[rgb(var(--foreground-subtle))]">
                  Container:
                </span>{" "}
                <span className="text-[rgb(var(--foreground))] font-medium">
                  {data.incidentReport.containerName}
                </span>
              </div>
              {data.incidentReport.symptoms &&
                data.incidentReport.symptoms.length > 0 && (
                  <div>
                    <span className="text-[rgb(var(--foreground-subtle))]">
                      Symptoms:
                    </span>
                    <ul className="ml-4 mt-1 list-disc text-[rgb(var(--foreground-muted))]">
                      {data.incidentReport.symptoms.map(
                        (symptom: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {symptom}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              {data.incidentReport.timestamp && (
                <div>
                  <span className="text-[rgb(var(--foreground-subtle))]">
                    Timestamp:
                  </span>{" "}
                  <span className="text-[rgb(var(--foreground-muted))]">
                    {new Date(data.incidentReport.timestamp).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Container Status */}
        {data.dockerList && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Container Status
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Total
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  {data.dockerList.totalCount}
                </div>
              </div>
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Running
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  {data.dockerList.runningCount}
                </div>
              </div>
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Healthy
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--success))]">
                  {data.dockerList.healthyCount}
                </div>
              </div>
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Unhealthy
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--error))]">
                  {data.dockerList.unhealthyCount || 0}
                </div>
              </div>
            </div>
            {data.dockerList.containers &&
              data.dockerList.containers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
                  <div className="text-[10px] font-medium text-[rgb(var(--foreground-subtle))] mb-2">
                    CONTAINERS
                  </div>
                  <div className="space-y-1">
                    {data.dockerList.containers.map(
                      (container: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                        >
                          <span className="text-[rgb(var(--foreground-muted))]">
                            {container.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                              {container.status}
                            </span>
                            {container.health === "healthy" ? (
                              <CheckCircle2 className="h-3 w-3 text-[rgb(var(--success))]" />
                            ) : (
                              <XCircle className="h-3 w-3 text-[rgb(var(--error))]" />
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Health Check Details */}
        {data.healthCheckScan && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Health Check Scan
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs mb-2">
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Scanned
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  {data.healthCheckScan.scannedCount}
                </div>
              </div>
              <div>
                <div className="text-[rgb(var(--foreground-subtle))]">
                  Unhealthy
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--error))]">
                  {data.healthCheckScan.unhealthyCount}
                </div>
              </div>
            </div>
            {data.healthCheckScan.unhealthyContainers &&
              data.healthCheckScan.unhealthyContainers.length > 0 && (
                <div className="text-xs">
                  <div className="text-[rgb(var(--foreground-subtle))] mb-1">
                    Unhealthy:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.healthCheckScan.unhealthyContainers.map(
                      (name: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[rgb(var(--error))]/10 text-[rgb(var(--error))] text-[10px] font-medium"
                        >
                          {name}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            {data.healthCheckScan.issues &&
              data.healthCheckScan.issues.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-[rgb(var(--foreground-subtle))] mb-1">
                    Issues:
                  </div>
                  <ul className="ml-4 list-disc text-[rgb(var(--foreground-muted))]">
                    {data.healthCheckScan.issues.map(
                      (issue: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          {issue}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* Root Cause */}
        {data.rootCause && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-[rgb(var(--warning))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Root Cause Analysis
              </span>
            </div>
            <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed mb-2">
              {data.rootCause}
            </p>
            {data.severity && (
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                    data.severity === "high" || data.severity === "critical"
                      ? "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))]"
                      : data.severity === "medium"
                        ? "bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]"
                        : "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                  }`}
                >
                  Severity: {data.severity.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selected Option / Recovery Strategy */}
        {data.selectedOption && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-[rgb(var(--success))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Recommended Action
              </span>
            </div>
            <p className="text-xs text-[rgb(var(--foreground-muted))] mb-2 leading-relaxed">
              {data.selectedOption.description}
            </p>
            <div className="flex items-center gap-3 text-[10px] flex-wrap">
              {data.selectedOption.estimatedDowntime && (
                <span className="text-[rgb(var(--foreground-subtle))]">
                  ⏱ {data.selectedOption.estimatedDowntime}
                </span>
              )}
              {data.selectedOption.riskLevel && (
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    data.selectedOption.riskLevel === "low"
                      ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                      : data.selectedOption.riskLevel === "medium"
                        ? "bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]"
                        : "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))]"
                  }`}
                >
                  {data.selectedOption.riskLevel} risk
                </span>
              )}
              {data.selectedOption.confidence && (
                <span className="text-[rgb(var(--foreground-subtle))]">
                  🎯 {Math.round((data.selectedOption.confidence || 0) * 100)}%
                  confidence
                </span>
              )}
            </div>
            {data.selectedOption.actions &&
              data.selectedOption.actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
                  <div className="text-[10px] font-medium text-[rgb(var(--foreground-subtle))] mb-2">
                    ACTIONS
                  </div>
                  <div className="space-y-1">
                    {data.selectedOption.actions.map(
                      (action: any, idx: number) => (
                        <div
                          key={idx}
                          className="text-xs p-2 rounded bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-mono"
                        >
                          <div className="text-[rgb(var(--primary))]">
                            {action.type}
                          </div>
                          {Object.entries(action)
                            .filter(([key]) => key !== "type")
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="text-[rgb(var(--foreground-muted))]"
                              >
                                {key}: {String(value)}
                              </div>
                            ))}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Alternative Options */}
        {data.alternativeOptions && data.alternativeOptions.length > 0 && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Alternative Options
              </span>
            </div>
            <div className="space-y-2">
              {data.alternativeOptions.map((option: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                >
                  <div className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                    {option.description}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        option.riskLevel === "low"
                          ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                          : option.riskLevel === "medium"
                            ? "bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]"
                            : "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))]"
                      }`}
                    >
                      {option.riskLevel}
                    </span>
                    {option.confidence && (
                      <span className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                        {Math.round(option.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Check Result */}
        {data.approval && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Risk Assessment
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {data.approval === "approved" ? (
                <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[rgb(var(--warning))]" />
              )}
              <span
                className={`text-xs font-medium ${
                  data.approval === "approved"
                    ? "text-[rgb(var(--success))]"
                    : "text-[rgb(var(--warning))]"
                }`}
              >
                {data.approval === "approved" ? "Approved" : "Pending Approval"}
              </span>
              {data.requiresHumanApproval && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]">
                  Human approval required
                </span>
              )}
            </div>
            {data.riskNotes && (
              <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                {data.riskNotes}
              </p>
            )}
          </div>
        )}

        {/* Proposed Action Details */}
        {data.proposedAction && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Proposed Action
              </span>
            </div>
            <p className="text-xs text-[rgb(var(--foreground-muted))] mb-2 leading-relaxed">
              {data.proposedAction.description}
            </p>
            {data.proposedAction.actions &&
              data.proposedAction.actions.length > 0 && (
                <div className="space-y-1">
                  {data.proposedAction.actions.map(
                    (action: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs p-2 rounded bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-mono text-[rgb(var(--foreground-muted))]"
                      >
                        {action.type}:{" "}
                        {JSON.stringify(action).substring(0, 100)}
                      </div>
                    ),
                  )}
                </div>
              )}
          </div>
        )}

        {/* Final Decision */}
        {data.action && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--success))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Final Decision
              </span>
            </div>
            <div className="mb-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]">
                Action: {data.action.toUpperCase()}
              </span>
            </div>
            {data.notes && (
              <p className="text-xs text-[rgb(var(--foreground-muted))] mb-2 leading-relaxed">
                {data.notes}
              </p>
            )}
            {data.confidenceScore && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[rgb(var(--border))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[rgb(var(--success))] rounded-full"
                    style={{ width: `${data.confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                  {Math.round(data.confidenceScore * 100)}% confidence
                </span>
              </div>
            )}
            {data.timestamp && (
              <div className="mt-2 text-[10px] text-[rgb(var(--foreground-subtle))]">
                {new Date(data.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Log Snippets */}
        {data.logSnippets && data.logSnippets.length > 0 && (
          <div className="bg-[rgb(var(--surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                Log Snippets
              </span>
            </div>
            <div className="space-y-1.5">
              {data.logSnippets.map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="text-[10px] font-mono bg-[rgb(var(--background))] p-2 rounded border border-[rgb(var(--border))]"
                >
                  <span className="text-[rgb(var(--foreground-subtle))]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="mx-1.5 text-[rgb(var(--border))]">|</span>
                  <span className="text-[rgb(var(--foreground-muted))]">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[rgb(var(--background))]">
      {/* Status Bar */}
      <div className="border-b border-[rgb(var(--border))] surface-elevated px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {overallStatus === "running" && (
                <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--primary))]" />
              )}
              {overallStatus === "success" && (
                <CheckCircle2 className="h-5 w-5 text-[rgb(var(--success))]" />
              )}
              {overallStatus === "error" && (
                <XCircle className="h-5 w-5 text-[rgb(var(--error))]" />
              )}
              <span className="text-sm font-semibold text-[rgb(var(--foreground))]">
                {overallStatus === "running" && "Executing..."}
                {overallStatus === "success" && "Completed"}
                {overallStatus === "error" && "Failed"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[rgb(var(--foreground-muted))]">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(elapsedTime)}</span>
          </div>
        </div>

        {/* Agent Progress */}
        <div className="flex items-center gap-2">
          {agents.map((agent, index) => {
            const status = agentStatuses[agent.id];
            return (
              <div key={agent.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    status?.status === "running"
                      ? "border-[rgb(var(--primary))]/30 bg-[rgb(var(--primary))]/10"
                      : status?.status === "success"
                        ? "border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/10"
                        : status?.status === "error"
                          ? "border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/10"
                          : "border-[rgb(var(--border))] surface"
                  }`}
                >
                  {getStatusIcon(status?.status || "pending")}
                  <span className="text-xs font-medium text-[rgb(var(--foreground))]">
                    {agent.name}
                  </span>
                  {status?.duration && (
                    <span className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                      {formatDuration(status.duration)}
                    </span>
                  )}
                </div>
                {index < agents.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-[rgb(var(--foreground-subtle))]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <AnimatePresence>
            {messages.map((message) => {
              const isExpanded = expandedMessages.has(message.id);
              const hasData =
                message.data && Object.keys(message.data).length > 0;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-[rgb(var(--border))] surface-elevated overflow-hidden"
                >
                  <button
                    onClick={() => hasData && toggleMessageExpanded(message.id)}
                    className="w-full text-left p-4 hover:surface transition-colors"
                    disabled={!hasData}
                  >
                    <div className="flex items-start gap-3">
                      {getMessageIcon(message.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                            {message.agentName}
                          </span>
                          <span className="text-xs text-[rgb(var(--foreground-subtle))]">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-[rgb(var(--foreground-muted))] leading-relaxed">
                          {message.message}
                        </p>
                      </div>

                      {hasData && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-[rgb(var(--foreground-subtle))]" />
                        </motion.div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && hasData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Terminal className="h-3 w-3 text-[rgb(var(--foreground-subtle))]" />
                          <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                            Details
                          </span>
                        </div>
                        {renderDataSection(message.data)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
