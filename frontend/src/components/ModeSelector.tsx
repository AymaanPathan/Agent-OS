/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion } from "framer-motion";
import { Workflow, Users } from "lucide-react";

export type WorkflowMode = "runbook" | "swarm";

interface ModeSelectorProps {
  mode: WorkflowMode;
  onChange: (mode: WorkflowMode) => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg surface-elevated border border-[rgb(var(--border))]">
      <button
        onClick={() => onChange("runbook")}
        className="relative px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {mode === "runbook" && (
          <motion.div
            layoutId="mode-selector"
            className="absolute inset-0 bg-[rgb(var(--primary))] rounded-md"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span
          className={`relative z-10 flex items-center gap-2 ${
            mode === "runbook"
              ? "text-[rgb(var(--primary-foreground))]"
              : "text-[rgb(var(--foreground-muted))]"
          }`}
        >
          <Workflow className="h-4 w-4" />
          Runbook
        </span>
      </button>

      <button
        onClick={() => onChange("swarm")}
        className="relative px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {mode === "swarm" && (
          <motion.div
            layoutId="mode-selector"
            className="absolute inset-0 bg-[rgb(var(--primary))] rounded-md"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span
          className={`relative z-10 flex items-center gap-2 ${
            mode === "swarm"
              ? "text-[rgb(var(--primary-foreground))]"
              : "text-[rgb(var(--foreground-muted))]"
          }`}
        >
          <Users className="h-4 w-4" />
          Agent Swarm
        </span>
      </button>
    </div>
  );
}
