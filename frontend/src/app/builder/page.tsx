/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Save,
  Play,
  Wand2,
  Search,
  X,
  Zap,
  Wrench,
  ShieldCheck,
  Activity,
  Plus,
  GripVertical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  List,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { nodesLibrary, nodeCategories } from "@/lib/nodesLibrary";
import { nodeConfigs } from "@/lib/nodeConfigs";
import { saveWorkflow } from "@/store/slices/workflows.slice";
import { AppDispatch } from "@/store/store";
import { useDispatch } from "react-redux";
import { startRun } from "@/store/slices/runsSlice";
import RunDashboard from "@/components/workflow/Rundashboard";
import AIWorkflowGenerator from "@/components/Aiworkflowgenerator";
import React from "react";
import StepConfigPanel from "@/components/StepConfigPanel";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getWorkspaceId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("agentos_workspace");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("agentos_workspace", id);
  }
  return id;
};

const workspaceId = getWorkspaceId();

const categoryIcons: Record<string, any> = {
  Triggers: Zap,
  Tools: Wrench,
  "Logic & Safety": ShieldCheck,
  Agents: Activity,
};

/** Colour palette per category — used by sidebar badges, accent stripes, pills */
const categoryMeta: Record<
  string,
  { color: string; bg: string; glow: string; accent: string }
> = {
  Triggers: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    glow: "shadow-yellow-500/20",
    accent: "#facc15",
  },
  Tools: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    glow: "shadow-blue-500/20",
    accent: "#60a5fa",
  },
  "Logic & Safety": {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    glow: "shadow-emerald-500/20",
    accent: "#34d399",
  },
  Agents: {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    glow: "shadow-purple-500/20",
    accent: "#c084fc",
  },
};

/** Node types that appear in the "Quick Add" pill row */
const QUICK_ADD_TYPES = [
  "trigger.webhook",
  "tools.restart_service",
  "logic.approval",
  "tools.docker_exec",
];

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Step (drag-sortable card)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineStep({ step, index, onClick, selected }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getRiskLevel = () => {
    const nodeType = step.data?.nodeType;
    if (
      nodeType?.includes("restart") ||
      nodeType?.includes("rollback") ||
      nodeType?.includes("bulk")
    ) {
      return {
        level: "high",
        color: "border-red-500/30 bg-red-500/5",
        badge: "bg-red-500/20 text-red-400",
      };
    }
    if (nodeType?.includes("approval")) {
      return {
        level: "approval",
        color: "border-orange-500/30 bg-orange-500/5",
        badge: "bg-orange-500/20 text-orange-400",
      };
    }
    if (nodeType?.includes("docker") || nodeType?.includes("monitor")) {
      return {
        level: "medium",
        color: "border-yellow-500/30 bg-yellow-500/5",
        badge: "bg-yellow-500/20 text-yellow-400",
      };
    }
    return {
      level: "safe",
      color: "border-green-500/30 bg-green-500/5",
      badge: "bg-green-500/20 text-green-400",
    };
  };

  const risk = getRiskLevel();
  const Icon = categoryIcons[step.data?.category] || Activity;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Connector Line */}
      {index > 0 && (
        <div className="absolute left-8 -top-4 w-0.5 h-4 bg-gradient-to-b from-zinc-700 to-transparent" />
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className={`group relative rounded-xl border-2 transition-all cursor-pointer ${
          selected
            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
            : `${risk.color} hover:border-zinc-600 hover:shadow-md`
        }`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-zinc-600" />
        </div>

        <div className="p-4 pl-10">
          <div className="flex items-start justify-between gap-3">
            {/* Step Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <span className="text-sm font-bold text-zinc-400">
                {index + 1}
              </span>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-semibold text-white">
                  {step.data?.label || "Unnamed Step"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {step.data?.desc || "No description"}
              </p>

              {/* Configuration Preview */}
              {step.data?.config &&
                Object.keys(step.data.config).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(step.data.config)
                      .slice(0, 3)
                      .map(([key, value]: any) => (
                        <span
                          key={key}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/50 text-zinc-400 border border-zinc-700"
                        >
                          {key}:{" "}
                          {typeof value === "object"
                            ? "configured"
                            : String(value).slice(0, 20)}
                        </span>
                      ))}
                    {Object.keys(step.data.config).length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/50 text-zinc-500">
                        +{Object.keys(step.data.config).length - 3} more
                      </span>
                    )}
                  </div>
                )}
            </div>

            {/* Risk Badge */}
            <div className="flex flex-col items-end gap-2">
              <span
                className={`text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide ${risk.badge}`}
              >
                {risk.level === "approval"
                  ? "⏸️ Approval"
                  : risk.level === "high"
                    ? "🔴 High Risk"
                    : risk.level === "medium"
                      ? "🟡 Caution"
                      : "🟢 Safe"}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Execution Indicators */}
        {step.status && (
          <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
            {step.status === "completed" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            )}
            {step.status === "running" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Clock className="h-3.5 w-3.5 text-blue-400" />
              </motion.div>
            )}
            {step.status === "failed" && (
              <X className="h-3.5 w-3.5 text-red-400" />
            )}
            {step.status === "paused" && (
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BuilderPage
// ─────────────────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const [selectedStep, setSelectedStep] = useState<any | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [workflowName, setWorkflowName] = useState("Incident Auto Recovery");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);

  /** Which categories are currently collapsed (closed) */
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

  const toggleCategory = (cat: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // ── DnD ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodesLibrary;
    const query = searchQuery.toLowerCase();
    return nodesLibrary.filter(
      (n) =>
        n.label.toLowerCase().includes(query) ||
        n.desc.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const groupedNodes = useMemo(() => {
    const map: Record<string, any[]> = {};
    nodeCategories.forEach((c) => (map[c] = []));
    filteredNodes.forEach((n) => map[n.category].push(n));
    return map;
  }, [filteredNodes]);

  // ── Step management ──────────────────────────────────────────────────────
  const addStep = useCallback((type: string) => {
    const item = nodesLibrary.find((n) => n.type === type);
    const schema = nodeConfigs[item?.type || ""];

    const initialConfig = schema
      ? Object.fromEntries(
          schema.fields
            .filter((f: any) => f.default !== undefined)
            .map((f: any) => [f.key, f.default]),
        )
      : {};

    if (!item) return;

    const newStep: any = {
      id: `${type}-${crypto.randomUUID()}`,
      type: item.type,
      data: {
        label: item.label,
        desc: item.desc,
        category: item.category,
        nodeType: item.type,
        config: initialConfig,
      },
    };

    setSteps((prev) => [...prev, newStep]);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    if (selectedStep?.id === stepId) setSelectedStep(null);
  };

  // ── Workflow persistence ─────────────────────────────────────────────────
  const dispatch = useDispatch<AppDispatch>();

  /** Shared helper that converts timeline steps → nodes + edges */
  const buildWorkloadPayload = () => {
    const nodes = steps.map((step, index) => ({
      id: step.id,
      type: step.type === "logic.ifelse" ? "ifElse" : "base",
      position: { x: 400, y: 120 + index * 180 },
      data: step.data,
    }));
    const edges = steps.slice(0, -1).map((step, index) => ({
      id: `e-${index}`,
      source: step.id,
      target: steps[index + 1].id,
      animated: true,
      style: { strokeWidth: 2, stroke: "#71717a" },
    }));
    return { nodes, edges };
  };

  const handleSave = () => {
    const { nodes, edges } = buildWorkloadPayload();
    dispatch(saveWorkflow({ name: workflowName, nodes, edges, workspaceId }));
  };

  const handleRun = async () => {
    const { nodes, edges } = buildWorkloadPayload();
    const workflow = await dispatch(
      saveWorkflow({ name: workflowName, nodes, edges, workspaceId }),
    ).unwrap();

    const res = await dispatch(
      startRun({ workflowId: workflow?.workflow?._id }),
    ).unwrap();

    setActiveRunId(res.runId);
    setShowDashboard(true);
  };

  const handleBackToBuilder = () => {
    setShowDashboard(false);
    setActiveRunId(null);
  };

  // ── AI-generated workflow ────────────────────────────────────────────────
  const handleAIWorkflowGenerated = (workflow: any) => {
    setWorkflowName(workflow.name);
    const timelineSteps = workflow.nodes.map((n: any) => ({
      id: n.id,
      type: n.type,
      data: {
        label: nodesLibrary.find((lib) => lib.type === n.type)?.label ?? n.type,
        desc: nodesLibrary.find((lib) => lib.type === n.type)?.desc ?? "",
        category:
          nodesLibrary.find((lib) => lib.type === n.type)?.category ?? "Tools",
        nodeType: n.type,
        config: n.configuration ?? {},
      },
    }));
    setSteps(timelineSteps);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      <AIWorkflowGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onWorkflowGenerated={handleAIWorkflowGenerated}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          BUILDER VIEW
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 flex"
        animate={{ x: showDashboard ? "-100%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
        <motion.div
          className="h-full border-r border-white/[0.08] bg-[#0f0f0f] flex flex-col"
          animate={{ width: sidebarCollapsed ? 0 : 320 }}
          transition={{ duration: 0.3 }}
        >
          {!sidebarCollapsed && (
            <>
              {/* Sidebar Header */}
              <div className="border-b border-white/[0.08] bg-[#1a1a1a] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-white">
                    <List className="h-3.5 w-3.5 text-black" />
                  </div>
                  <div className="text-sm font-medium text-white">
                    Step Library
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search steps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] pl-9 pr-8 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-white/[0.12] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/[0.05]"
                    >
                      <X className="h-3 w-3 text-zinc-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Steps List (redesigned) ─────────────────────────── */}
              <div className="flex-1 overflow-auto p-3">
                {/* Quick-add pills — hidden while searching */}
                {!searchQuery && (
                  <div className="mb-4">
                    <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1 mb-2">
                      Quick Add
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nodesLibrary
                        .filter((n) => QUICK_ADD_TYPES.includes(n.type))
                        .map((node) => {
                          const Icon = categoryIcons[node.category] || Activity;
                          const meta =
                            categoryMeta[node.category] ||
                            categoryMeta["Tools"];
                          return (
                            <motion.button
                              key={node.type}
                              onClick={() => addStep(node.type)}
                              whileTap={{ scale: 0.88 }}
                              title={node.label}
                              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] ${meta.bg} hover:border-white/[0.18] hover:shadow-md ${meta.glow} transition-all duration-150`}
                            >
                              <Icon className={`h-3 w-3 ${meta.color}`} />
                              <span
                                className="text-[10px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate"
                                style={{ maxWidth: 72 }}
                              >
                                {node.label}
                              </span>
                              <Plus className="h-2.5 w-2.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                            </motion.button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Divider between quick-add and categories */}
                {!searchQuery && (
                  <div className="border-t border-white/[0.06] mb-3" />
                )}

                {/* Categorised node list */}
                <div className="space-y-1.5">
                  {Object.entries(groupedNodes).map(([category, items]) => {
                    if (items.length === 0) return null;

                    const Icon = categoryIcons[category] || Activity;
                    const meta =
                      categoryMeta[category] || categoryMeta["Tools"];
                    const isCollapsed = !!collapsedCategories[category];

                    return (
                      <div
                        key={category}
                        className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.015]"
                      >
                        {/* Category header */}
                        <motion.button
                          onClick={() => toggleCategory(category)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Coloured icon badge */}
                            <div
                              className={`flex items-center justify-center rounded-md ${meta.bg} border border-white/[0.08]`}
                              style={{ width: 22, height: 22 }}
                            >
                              <Icon className={`h-3 w-3 ${meta.color}`} />
                            </div>
                            <span className="text-xs font-semibold text-zinc-300">
                              {category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Count badge */}
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-500">
                              {items.length}
                            </span>
                            {/* Animated chevron */}
                            <motion.div
                              animate={{ rotate: isCollapsed ? -90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                            </motion.div>
                          </div>
                        </motion.button>

                        {/* Expandable node list */}
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: "easeInOut",
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-2 pb-2 space-y-0.5">
                                {items.map((node: any) => (
                                  <motion.button
                                    key={node.type}
                                    onClick={() => addStep(node.type)}
                                    className="w-full group"
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.96 }}
                                  >
                                    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-150">
                                      {/* Left colour accent stripe */}
                                      <div
                                        className="flex-shrink-0 w-0.5 rounded-full"
                                        style={{
                                          height: 28,
                                          background: meta.accent,
                                          opacity: 0.4,
                                        }}
                                      />

                                      {/* Label + description */}
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                                          {node.label}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 group-hover:text-zinc-500 leading-snug truncate transition-colors">
                                          {node.desc}
                                        </div>
                                      </div>

                                      {/* Add button */}
                                      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-transparent group-hover:bg-white/[0.08] transition-all">
                                        <Plus className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                                      </div>
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Empty / no-results state */}
                {filteredNodes.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-14"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-3">
                      <Search className="h-5 w-5 text-zinc-600" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500">
                      No steps match
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Try a different search term
                    </p>
                    <motion.button
                      onClick={() => setSearchQuery("")}
                      whileTap={{ scale: 0.95 }}
                      className="mt-3 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear search
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* ─── MAIN CONTENT ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-50 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#1a1a1a] px-6"
          >
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <List className="h-4 w-4 text-zinc-400" />
              </button>

              <div className="h-6 w-px bg-white/[0.08]" />

              <div>
                <div className="text-sm text-zinc-300 font-medium">
                  {workflowName}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {steps.length} {steps.length === 1 ? "step" : "steps"} •
                  Timeline Builder
                </div>
              </div>
            </motion.div>

            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white transition-all duration-200 px-3 text-xs font-medium"
                  onClick={() => setShowAIGenerator(true)}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  AI Generate
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-white/[0.12] bg-transparent hover:bg-white/[0.05] text-zinc-300 hover:text-white transition-all duration-200 px-3 text-xs font-medium"
                  onClick={handleSave}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-white hover:bg-zinc-200 text-black transition-all duration-200 px-3 text-xs font-medium"
                  onClick={handleRun}
                  disabled={steps.length === 0}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                  Run Runbook
                </Button>
              </motion.div>
            </motion.div>
          </motion.header>

          {/* ─── Timeline Canvas ─────────────────────────────────────── */}
          <div className="flex-1 overflow-auto bg-[#0a0a0a] p-6">
            <div className="max-w-4xl mx-auto">
              {steps.length === 0 ? (
                /* Empty state */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.08] mb-6">
                    <List className="h-10 w-10 text-zinc-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Build Your Runbook
                  </h2>
                  <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                    Add steps from the library or use AI to generate a complete
                    incident response runbook
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setShowAIGenerator(true)}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSidebarCollapsed(false)}
                      className="border-white/[0.12] bg-transparent hover:bg-white/[0.05]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Steps Manually
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Timeline Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Runbook Timeline
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">
                        Steps execute sequentially from top to bottom
                      </p>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Estimated duration: ~{steps.length * 2}s
                    </div>
                  </div>

                  {/* DnD Timeline */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={steps.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0">
                        {steps.map((step, index) => (
                          <TimelineStep
                            key={step.id}
                            step={step}
                            index={index}
                            selected={selectedStep?.id === step.id}
                            onClick={() => setSelectedStep(step)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Add Step CTA */}
                  <motion.button
                    onClick={() => setSidebarCollapsed(false)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Step</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Step config slide-over */}
          {selectedStep && (
            <StepConfigPanel
              step={selectedStep}
              allSteps={steps}
              onClose={() => setSelectedStep(null)}
              onChange={(updated: any) => {
                setSteps((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s)),
                );
                setSelectedStep(updated);
              }}
              onDelete={handleDeleteStep}
            />
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          DASHBOARD VIEW (slides in from right)
          Uses the EXISTING RunDashboard component from document 6
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a]"
        initial={{ x: "100%" }}
        animate={{ x: showDashboard ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {activeRunId && showDashboard && (
          <RunDashboard runId={activeRunId} onClose={handleBackToBuilder} />
        )}
      </motion.div>
    </div>
  );
}
