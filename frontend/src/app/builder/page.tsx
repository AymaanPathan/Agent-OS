"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import BuilderPage from "../../components/BuilderPage";
import AgentSwarmPage from "@/components/AgentSwarmPage";
import ModeSelector, { WorkflowMode } from "@/components/ModeSelector";

export default function Home() {
  const [mode, setMode] = useState<WorkflowMode>("runbook");

  return (
    <div className="h-screen w-screen overflow-hidden bg-[rgb(var(--background))]">
      {/* Mode Selector Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <ModeSelector mode={mode} onChange={setMode} />
      </div>

      {/* Content */}
      <motion.div
        className="h-full w-full"
        animate={{ x: mode === "runbook" ? "0%" : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex h-full w-[200%]">
          <div className="w-1/2 h-full">
            <BuilderPage />
          </div>
          <div className="w-1/2 h-full">
            <AgentSwarmPage />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
