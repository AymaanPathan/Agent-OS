/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion } from "framer-motion";
import { Workflow, Users, Activity, GripVertical } from "lucide-react";
import { useState, useRef } from "react";

export type WorkflowMode = "runbook" | "monitor" | "swarm";

interface ModeSelectorProps {
  mode: WorkflowMode;
  onChange: (mode: WorkflowMode) => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);

  return (
    <>
      {/* Drag Constraints Container - invisible full viewport boundary */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none"
        style={{ padding: "24px" }} // Keep 24px padding from edges
      />

      {/* Draggable Mode Selector */}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        whileDrag={{ scale: 1.05, cursor: "grabbing" }}
        className={`fixed z-50 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          bottom: "24px",
          left: "24px",
          touchAction: "none", // Prevent touch scrolling while dragging
        }}
      >
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-xl surface-elevated border border-[rgb(var(--border))] shadow-2xl backdrop-blur-sm">
          {/* Drag Handle */}
          <div className="px-2 py-2.5 flex items-center justify-center text-[rgb(var(--foreground-subtle))] hover:text-[rgb(var(--foreground-muted))] transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Vertical Divider */}
          <div className="h-8 w-px bg-[rgb(var(--border))]" />

          {/* Mode Buttons */}
          <button
            onClick={() => onChange("runbook")}
            className="relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            {mode === "runbook" && (
              <motion.div
                layoutId="mode-selector"
                className="absolute inset-0 bg-[rgb(var(--primary))] rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-2 transition-colors ${
                mode === "runbook"
                  ? "text-[rgb(var(--primary-foreground))]"
                  : "text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
              }`}
            >
              <Workflow className="h-4 w-4" />
              <span className="font-semibold">Runbook</span>
            </span>
          </button>

          <button
            onClick={() => onChange("monitor")}
            className="relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            {mode === "monitor" && (
              <motion.div
                layoutId="mode-selector"
                className="absolute inset-0 bg-[rgb(var(--primary))] rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-2 transition-colors ${
                mode === "monitor"
                  ? "text-[rgb(var(--primary-foreground))]"
                  : "text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span className="font-semibold">Monitor</span>
            </span>
          </button>

          <button
            onClick={() => onChange("swarm")}
            className="relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            {mode === "swarm" && (
              <motion.div
                layoutId="mode-selector"
                className="absolute inset-0 bg-[rgb(var(--primary))] rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-2 transition-colors ${
                mode === "swarm"
                  ? "text-[rgb(var(--primary-foreground))]"
                  : "text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="font-semibold">Agent Swarm</span>
            </span>
          </button>
        </div>

        {/* Drag Hint - Shows on hover when not dragging */}
        {!isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg surface-elevated border border-[rgb(var(--border))] shadow-lg pointer-events-none"
          >
            <div className="text-xs text-[rgb(var(--foreground-muted))] whitespace-nowrap flex items-center gap-1">
              <GripVertical className="h-3 w-3" />
              Drag to reposition
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
