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
  X,
  ChevronRight,
  Sparkles,
  Users,
  Activity,
  FileText,
  Settings,
  Info,
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
                {enabledAgents.length} of {agents.length} agents enabled
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showSettings
                ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] border border-[rgb(var(--primary))]/20"
                : "hover:surface text-[rgb(var(--foreground-muted))] border border-transparent"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>

          {!isExecuting ? (
            <button
              onClick={handleRunSwarm}
              disabled={!canRun}
              className="px-4 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Swarm
            </button>
          ) : (
            <button
              onClick={handleStopSwarm}
              className="px-4 py-1.5 rounded-lg border border-[rgb(var(--error))] text-[rgb(var(--error))] hover:bg-[rgb(var(--error))]/10 text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Stop
            </button>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Configuration */}
        <motion.div
          className="w-[420px] border-r border-[rgb(var(--border))] surface flex flex-col overflow-hidden"
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
                className="w-full h-32 px-3 py-2.5 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/20 resize-none leading-relaxed"
                disabled={isExecuting}
              />
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-[rgb(var(--primary))]/5 border border-[rgb(var(--primary))]/10">
                <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--primary))] flex-shrink-0" />
                <span className="text-xs text-[rgb(var(--foreground-muted))]">
                  AI will parse your goal and coordinate agents automatically
                </span>
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
                <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
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
                        ? "border-[rgb(var(--primary))]/30 surface-elevated shadow-sm"
                        : "border-[rgb(var(--border))] surface hover:surface-elevated"
                    } ${isExecuting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    whileHover={{ scale: isExecuting ? 1 : 1.01 }}
                    whileTap={{ scale: isExecuting ? 1 : 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-lg ${
                          agent.enabled
                            ? "bg-[rgb(var(--primary))]/10 border-[rgb(var(--primary))]/20"
                            : "surface border-[rgb(var(--border))]"
                        } border flex items-center justify-center transition-colors`}
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
                        <div className="flex items-center gap-2 mb-1">
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
                            <CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
                          )}
                        </div>
                        <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
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
                  className="overflow-hidden"
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
                            ? "border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/5 shadow-sm"
                            : "border-[rgb(var(--border))] surface hover:surface-elevated"
                        } ${isExecuting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                        whileHover={{ scale: isExecuting ? 1 : 1.01 }}
                        whileTap={{ scale: isExecuting ? 1 : 0.99 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
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
                              className={`text-sm font-medium mb-0.5 ${
                                option.enabled
                                  ? "text-[rgb(var(--foreground))]"
                                  : "text-[rgb(var(--foreground-muted))]"
                              }`}
                            >
                              {option.label}
                            </div>
                            <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
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

                {enabledAgents.length > 0 ? (
                  <div className="space-y-2">
                    {enabledAgents.map((agent, index) => (
                      <div key={agent.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 flex-shrink-0">
                          <span className="text-xs font-semibold text-[rgb(var(--primary))]">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-[rgb(var(--foreground-muted))]">
                            {agent.name}
                          </span>
                          {index < enabledAgents.length - 1 && (
                            <ChevronRight className="h-3.5 w-3.5 text-[rgb(var(--foreground-subtle))]" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
                      <div className="flex items-start gap-2 text-xs text-[rgb(var(--foreground-muted))]">
                        <Info className="h-3.5 w-3.5 text-[rgb(var(--primary))] flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          Agents will execute sequentially, coordinating to
                          resolve the incident
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20 mb-3">
                      <AlertTriangle className="h-6 w-6 text-[rgb(var(--warning))]" />
                    </div>
                    <p className="text-sm font-medium text-[rgb(var(--foreground))] mb-1">
                      No agents selected
                    </p>
                    <p className="text-xs text-[rgb(var(--foreground-muted))]">
                      Enable at least one agent to begin
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
              <div className="text-center max-w-lg">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl surface-elevated border border-[rgb(var(--border))] shadow-sm mb-6">
                  <Users className="h-12 w-12 text-[rgb(var(--primary))]" />
                </div>
                <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-3">
                  Ready to Deploy Agent Swarm
                </h2>
                <p className="text-[rgb(var(--foreground-muted))] mb-8 leading-relaxed">
                  Configure your incident goal and select agents. When ready,
                  click <strong>Run Swarm</strong> to begin AI-powered incident
                  response with coordinated multi-agent collaboration.
                </p>
                <div className="flex items-center justify-center gap-6 text-xs text-[rgb(var(--foreground-subtle))]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[rgb(var(--success))]" />
                    <span>Safety verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[rgb(var(--primary))]" />
                    <span>Real-time monitoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[rgb(var(--warning))]" />
                    <span>Full audit trail</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
