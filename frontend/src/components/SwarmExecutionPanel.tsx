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
  Brain,
  Shield,
  Zap,
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

        // Try to extract structured data
        let parsedResponse: any = {};
        try {
          // Look for JSON in the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // If parsing fails, use the raw text
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
    addMessage({
      agentId: "incident-commander",
      agentName: "Incident Commander",
      type: "success",
      message:
        "Initial assessment complete. Delegating to specialized agents...",
      data: parsedData.incident_assessment || parsedData,
    });

    // Log Detective
    if (agents.find((a) => a.id === "log-detective")) {
      await delay(500);
      updateAgentStatus("log-detective", "running");
      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type: "info",
        message: "Analyzing container logs...",
      });

      await delay(2000);
      updateAgentStatus("log-detective", "success");
      addMessage({
        agentId: "log-detective",
        agentName: "Log Detective",
        type: "success",
        message: parsedData.root_cause || "Root cause analysis complete",
        data: parsedData.diagnosis || { confidence: parsedData.confidence },
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
        message: "Generating recovery strategies...",
      });

      await delay(1500);
      updateAgentStatus("recovery-strategist", "success");
      addMessage({
        agentId: "recovery-strategist",
        agentName: "Recovery Strategist",
        type: "success",
        message:
          parsedData.recommendedAction || "Recovery strategy recommended",
        data: parsedData.strategies || { action: parsedData.finalAction },
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
      const needsApproval = parsedData.needsApproval || false;
      updateAgentStatus("risk-checker", "success");
      addMessage({
        agentId: "risk-checker",
        agentName: "Risk Checker",
        type: needsApproval ? "warning" : "success",
        message: needsApproval
          ? "⚠️ Action requires human approval"
          : "✅ Action approved - risk within acceptable thresholds",
        data: {
          approved: !needsApproval,
          riskScore: parsedData.riskScore,
          reason: parsedData.reason,
        },
      });
    }

    // Final summary
    await delay(500);
    addMessage({
      agentId: "system",
      agentName: "System",
      type: "success",
      message: "All agents have completed their tasks",
      data: { fullResponse: parsedData },
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
                        <p className="text-sm text-[rgb(var(--foreground-muted))]">
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
                        <div className="flex items-center gap-2 mb-2">
                          <Terminal className="h-3 w-3 text-[rgb(var(--foreground-subtle))]" />
                          <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                            Data
                          </span>
                        </div>
                        <pre className="text-xs text-[rgb(var(--foreground-muted))] bg-[rgb(var(--surface))] p-3 rounded overflow-x-auto font-mono">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
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
