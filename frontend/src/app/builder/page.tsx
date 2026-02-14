/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BuilderPage from "../../components/BuilderPage";
import AgentSwarmPage from "@/components/AgentSwarmPage";
import MonitorDashboard from "@/components/MonitorDashboard";
import ModeSelector, { WorkflowMode } from "@/components/ModeSelector";
import DockerConnectionModal from "@/components/DockerConnectionDialog";
import DockerStatusIndicator from "@/components/Dockerstatusindicator";
import { useDockerConnection } from "@/hooks/useDockerConnection";
import { Server, AlertCircle, Loader2 } from "lucide-react";

export default function Home() {
  const [mode, setMode] = useState<WorkflowMode>("runbook");
  const [showDockerModal, setShowDockerModal] = useState(false);
  const { status, isLoading, isConnected, checkStatus } = useDockerConnection();

  // Show Docker modal on mount if not connected
  useEffect(() => {
    if (!isLoading && !isConnected) {
      setShowDockerModal(true);
    }
  }, [isLoading, isConnected]);

  const handleDockerConnected = () => {
    checkStatus();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[rgb(var(--background))]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary))] mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--foreground-muted))]">
            Checking Docker connection...
          </p>
        </div>
      </div>
    );
  }

  // Docker not connected - show blocking overlay
  if (!isConnected) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[rgb(var(--background))] relative">
        {/* Blurred content in background */}
        <div className="absolute inset-0 filter blur-sm opacity-30 pointer-events-none">
          <BuilderPage />
        </div>

        {/* Docker connection required overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--background))]/80 backdrop-blur-sm">
          <div className="max-w-md w-full mx-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-xl border border-[rgb(var(--border))] surface-elevated shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--error))]/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgb(var(--error))]/10 border border-[rgb(var(--error))]/20">
                    <Server className="h-6 w-6 text-[rgb(var(--error))]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[rgb(var(--foreground))]">
                      Docker Connection Required
                    </h2>
                    <p className="text-xs text-[rgb(var(--foreground-muted))]">
                      This is an SRE system that requires Docker access
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="rounded-lg border border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[rgb(var(--error))] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[rgb(var(--foreground))] mb-1">
                        No Docker Connection Detected
                      </p>
                      <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                        {status?.error ||
                          "Please connect to Docker to use any features of this system."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-[rgb(var(--foreground-muted))]">
                  <p className="flex items-start gap-2">
                    <span className="text-[rgb(var(--primary))]">•</span>
                    <span>
                      All monitoring, workflow execution, and container
                      management features require active Docker connection
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-[rgb(var(--primary))]">•</span>
                    <span>
                      For local setup, ensure Docker Desktop or Docker Engine is
                      running
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-[rgb(var(--primary))]">•</span>
                    <span>
                      For remote setup, configure Docker remote API access
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[rgb(var(--border))] surface px-6 py-4">
                <button
                  onClick={() => setShowDockerModal(true)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Server className="h-4 w-4" />
                  Connect to Docker
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Docker Connection Modal */}
        <DockerConnectionModal
          isOpen={showDockerModal}
          onClose={() => setShowDockerModal(false)}
          onConnected={handleDockerConnected}
        />
      </div>
    );
  }

  // Docker is connected - show normal interface
  return (
    <div className="h-screen w-screen overflow-hidden bg-[rgb(var(--background))] relative">
      {/* Mode Selector */}
      <ModeSelector mode={mode} onChange={setMode} />

      {/* Content */}
      <AnimatePresence mode="wait">
        {mode === "runbook" && (
          <motion.div
            key="runbook"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <BuilderPage />
          </motion.div>
        )}

        {mode === "monitor" && (
          <motion.div
            key="monitor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <MonitorDashboard onClose={() => setMode("runbook")} />
          </motion.div>
        )}

        {mode === "swarm" && (
          <motion.div
            key="swarm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <AgentSwarmPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docker Status Indicator - Bottom Right */}
      <DockerStatusIndicator onOpenSettings={() => setShowDockerModal(true)} />

      {/* Docker Connection Modal */}
      <DockerConnectionModal
        isOpen={showDockerModal}
        onClose={() => setShowDockerModal(false)}
        onConnected={handleDockerConnected}
      />
    </div>
  );
}
