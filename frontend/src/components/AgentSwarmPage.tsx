/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Brain,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  Users,
  Activity,
  FileText,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SwarmExecutionPanel from "./SwarmExecutionPanel";

interface SubAgent {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  enabled: boolean;
}

const AVAILABLE_AGENTS: SubAgent[] = [
  {
    id: "incident-commander",
    name: "Incident Commander",
    description:
      "Orchestrates the response workflow and coordinates other agents",
    icon: Users,
    color: "text-purple-500",
    enabled: true,
  },
  {
    id: "log-detective",
    name: "Log Detective",
    description: "Analyzes container logs to identify root causes",
    icon: FileText,
    color: "text-blue-500",
    enabled: true,
  },
  {
    id: "recovery-strategist",
    name: "Recovery Strategist",
    description: "Recommends ranked recovery options with risk assessment",
    icon: Brain,
    color: "text-emerald-500",
    enabled: true,
  },
  {
    id: "risk-checker",
    name: "Risk Checker",
    description: "Evaluates proposed actions against risk thresholds",
    icon: Shield,
    color: "text-amber-500",
    enabled: true,
  },
];

const SAFETY_OPTIONS = [
  {
    id: "require_approval",
    label: "Require Approval for Risky Actions",
    description: "Actions with risk score > 7 need manual approval",
    enabled: true,
  },
  {
    id: "auto_rollback",
    label: "Auto Rollback on Failure",
    description: "Automatically revert changes if verification fails",
    enabled: true,
  },
  {
    id: "notification",
    label: "Send Notifications",
    description: "Alert stakeholders via Slack on critical events",
    enabled: false,
  },
];

export default function AgentSwarmPage() {
  const [goal, setGoal] = useState(
    "Container error-test is not working. Investigate and fix the issue safely.",
  );
  const [agents, setAgents] = useState<SubAgent[]>(AVAILABLE_AGENTS);
  const [safetyOptions, setSafetyOptions] = useState(SAFETY_OPTIONS);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const toggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent,
      ),
    );
  };

  const toggleSafety = (optionId: string) => {
    setSafetyOptions((prev) =>
      prev.map((option) =>
        option.id === optionId
          ? { ...option, enabled: !option.enabled }
          : option,
      ),
    );
  };

  const handleRunSwarm = async () => {
    setIsExecuting(true);
    const execId = `swarm-${Date.now()}`;
    setExecutionId(execId);
  };

  const handleStopSwarm = () => {
    setIsExecuting(false);
    setExecutionId(null);
  };

  const enabledAgents = agents.filter((a) => a.enabled);
  const canRun = goal.trim().length > 0 && enabledAgents.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[rgb(var(--background))] overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex h-14 items-center justify-between border-b border-[rgb(var(--border))] surface-elevated px-6 flex-shrink-0"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
              <Users className="h-5 w-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[rgb(var(--foreground))]">
                Agent Swarm
              </div>
              <div className="text-xs text-[rgb(var(--foreground-muted))]">
                {enabledAgents.length} agents enabled
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </Button>

          {!isExecuting ? (
            <Button
              size="sm"
              className="h-8 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))]"
              onClick={handleRunSwarm}
              disabled={!canRun}
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
              Run Swarm
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-[rgb(var(--error))] text-[rgb(var(--error))]"
              onClick={handleStopSwarm}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Stop
            </Button>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Configuration */}
        <motion.div
          className="w-[480px] border-r border-[rgb(var(--border))] surface flex flex-col overflow-hidden"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Goal Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-[rgb(var(--primary))]" />
                <label className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  Incident Goal
                </label>
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what you want the agent swarm to accomplish..."
                className="w-full h-28 px-3 py-2 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/20 resize-none"
                disabled={isExecuting}
              />
              <div className="flex items-center gap-2 mt-2 text-xs text-[rgb(var(--foreground-muted))]">
                <Sparkles className="h-3 w-3" />
                <span>AI will parse your goal and coordinate agents</span>
              </div>
            </div>

            {/* Agent Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[rgb(var(--primary))]" />
                  <label className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    Sub-Agents
                  </label>
                </div>
                <span className="text-xs text-[rgb(var(--foreground-muted))]">
                  {enabledAgents.length}/{agents.length} enabled
                </span>
              </div>

              <div className="space-y-2">
                {agents.map((agent) => (
                  <motion.button
                    key={agent.id}
                    onClick={() => !isExecuting && toggleAgent(agent.id)}
                    disabled={isExecuting}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      agent.enabled
                        ? "border-[rgb(var(--primary))]/30 surface-elevated"
                        : "border-[rgb(var(--border))] surface hover:surface-elevated"
                    }`}
                    whileHover={{ scale: isExecuting ? 1 : 1.01 }}
                    whileTap={{ scale: isExecuting ? 1 : 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg ${
                          agent.enabled
                            ? "bg-[rgb(var(--primary))]/10"
                            : "surface"
                        } border border-[rgb(var(--border))] flex items-center justify-center`}
                      >
                        <agent.icon
                          className={`h-4 w-4 ${
                            agent.enabled
                              ? "text-[rgb(var(--primary))]"
                              : "text-[rgb(var(--foreground-muted))]"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              agent.enabled
                                ? "text-[rgb(var(--foreground))]"
                                : "text-[rgb(var(--foreground-muted))]"
                            }`}
                          >
                            {agent.name}
                          </span>
                          {agent.enabled && (
                            <CheckCircle2 className="h-3 w-3 text-[rgb(var(--primary))]" />
                          )}
                        </div>
                        <p className="text-xs text-[rgb(var(--foreground-muted))] mt-0.5">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Safety Options */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-[rgb(var(--primary))]" />
                    <label className="text-sm font-semibold text-[rgb(var(--foreground))]">
                      Safety Controls
                    </label>
                  </div>

                  <div className="space-y-2">
                    {safetyOptions.map((option) => (
                      <motion.button
                        key={option.id}
                        onClick={() => !isExecuting && toggleSafety(option.id)}
                        disabled={isExecuting}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          option.enabled
                            ? "border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/5"
                            : "border-[rgb(var(--border))] surface hover:surface-elevated"
                        }`}
                        whileHover={{ scale: isExecuting ? 1 : 1.01 }}
                        whileTap={{ scale: isExecuting ? 1 : 0.99 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center ${
                              option.enabled
                                ? "bg-[rgb(var(--success))] border-[rgb(var(--success))]"
                                : "surface border-[rgb(var(--border))]"
                            }`}
                          >
                            {option.enabled && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium ${
                                option.enabled
                                  ? "text-[rgb(var(--foreground))]"
                                  : "text-[rgb(var(--foreground-muted))]"
                              }`}
                            >
                              {option.label}
                            </div>
                            <p className="text-xs text-[rgb(var(--foreground-muted))] mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Execution Preview */}
            {!isExecuting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-[rgb(var(--border))] surface-elevated p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-[rgb(var(--primary))]" />
                  <span className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    Execution Plan
                  </span>
                </div>

                <div className="space-y-2">
                  {enabledAgents.map((agent, index) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 text-xs"
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 text-[rgb(var(--primary))] font-medium">
                        {index + 1}
                      </div>
                      <span className="text-[rgb(var(--foreground-muted))]">
                        {agent.name}
                      </span>
                      {index < enabledAgents.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-[rgb(var(--foreground-subtle))]" />
                      )}
                    </div>
                  ))}
                </div>

                {enabledAgents.length === 0 && (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-8 w-8 text-[rgb(var(--warning))] mx-auto mb-2" />
                    <p className="text-xs text-[rgb(var(--foreground-muted))]">
                      No agents enabled. Select at least one agent to proceed.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right Panel - Execution */}
        <div className="flex-1 overflow-hidden">
          {isExecuting && executionId ? (
            <SwarmExecutionPanel
              executionId={executionId}
              goal={goal}
              agents={enabledAgents}
              safetyOptions={safetyOptions}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center p-12"
            >
              <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl surface-elevated border border-[rgb(var(--border))] mb-6">
                  <Users className="h-10 w-10 text-[rgb(var(--primary))]" />
                </div>
                <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
                  Ready to Deploy Swarm
                </h2>
                <p className="text-[rgb(var(--foreground-muted))] mb-6">
                  Configure your goal and select agents, then click Run Swarm to
                  begin AI-powered incident response
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-[rgb(var(--foreground-subtle))]">
                  <Shield className="h-3 w-3" />
                  <span>All actions are monitored and logged</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
