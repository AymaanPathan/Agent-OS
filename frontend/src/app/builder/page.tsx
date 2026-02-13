"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BuilderPage from "../../components/BuilderPage";
import AgentSwarmPage from "@/components/AgentSwarmPage";
import MonitorDashboard from "@/components/MonitorDashboard";
import ModeSelector, { WorkflowMode } from "@/components/ModeSelector";

export default function Home() {
  const [mode, setMode] = useState<WorkflowMode>("runbook");

  return (
    <div className="h-screen w-screen overflow-hidden bg-[rgb(var(--background))] relative">
      {/* Draggable Mode Selector - Manages its own position */}
      <ModeSelector mode={mode} onChange={setMode} />

      {/* Content - Only render the active mode */}
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
    </div>
  );
}
