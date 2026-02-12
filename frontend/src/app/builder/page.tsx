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
  Plus,
  GripVertical,
  ChevronRight,
  ChevronDown,
  List,
  Moon,
  Sun,
  Activity,
  Zap,
  Wrench,
  ShieldCheck,
  LayoutGrid,
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
import { useTheme } from "@/components/ThemeProvider";
import MonitorDashboard from "@/components/MonitorDashboard";

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

const categoryMeta: Record<string, { color: string; lightColor: string }> = {
  Triggers: {
    color: "text-amber-600 dark:text-amber-500",
    lightColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  Tools: {
    color: "text-blue-600 dark:text-blue-500",
    lightColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  "Logic & Safety": {
    color: "text-emerald-600 dark:text-emerald-500",
    lightColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  Agents: {
    color: "text-purple-600 dark:text-purple-500",
    lightColor: "bg-purple-50 dark:bg-purple-950/30",
  },
};

const QUICK_ADD_TYPES = [
  "tool.httpHealth",
  "tool.dockerStatus",
  "logic.approval",
  "agent.aiAnalyzer",
];

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Step Component
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

  const Icon = categoryIcons[step.data?.category] || Activity;
  const meta = categoryMeta[step.data?.category] || categoryMeta["Tools"];

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {index > 0 && (
        <div className="absolute left-6 -top-3 w-px h-3 bg-gray-200 dark:bg-gray-800" />
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        onClick={onClick}
        className={`group relative rounded-xl border transition-all cursor-pointer ${
          selected
            ? "border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        <div className="p-4 pl-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {index + 1}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${meta.color}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {step.data?.label || "Unnamed Step"}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {step.data?.desc || "No description"}
              </p>

              {step.data?.config &&
                Object.keys(step.data.config).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(step.data.config)
                      .slice(0, 2)
                      .map(([key, value]: any) => (
                        <span
                          key={key}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                        >
                          {key}:{" "}
                          {typeof value === "object"
                            ? "•"
                            : String(value).slice(0, 15)}
                        </span>
                      ))}
                    {Object.keys(step.data.config).length > 2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500">
                        +{Object.keys(step.data.config).length - 2}
                      </span>
                    )}
                  </div>
                )}
            </div>

            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BuilderPage
// ─────────────────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { theme, toggleTheme } = useTheme();
  const [selectedStep, setSelectedStep] = useState<any | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [workflowName, setWorkflowName] = useState(
    "Incident Response Workflow",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

  const toggleCategory = (cat: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const dispatch = useDispatch<AppDispatch>();

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
      style: {
        strokeWidth: 2,
        stroke: theme === "dark" ? "#4b5563" : "#d1d5db",
      },
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AIWorkflowGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onWorkflowGenerated={handleAIWorkflowGenerated}
      />

      {/* Builder View */}
      <motion.div
        className="absolute inset-0 flex"
        animate={{ x: showDashboard ? "-100%" : showMonitor ? "-100%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Sidebar */}
        <motion.div
          className="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col"
          animate={{ width: sidebarCollapsed ? 0 : 320 }}
          transition={{ duration: 0.2 }}
        >
          {!sidebarCollapsed && (
            <>
              <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                    <LayoutGrid className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Step Library
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search steps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-8 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3">
                {!searchQuery && (
                  <div className="mb-4">
                    <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-2">
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
                              whileTap={{ scale: 0.95 }}
                              title={node.label}
                              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 ${meta.lightColor} hover:border-gray-300 dark:hover:border-gray-600 transition-all`}
                            >
                              <Icon className={`h-3 w-3 ${meta.color}`} />
                              <span
                                className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate"
                                style={{ maxWidth: 72 }}
                              >
                                {node.label}
                              </span>
                              <Plus className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                            </motion.button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {!searchQuery && (
                  <div className="border-t border-gray-200 dark:border-gray-800 mb-3" />
                )}

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
                        className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                      >
                        <motion.button
                          onClick={() => toggleCategory(category)}
                          whileTap={{ scale: 0.99 }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex items-center justify-center rounded-md ${meta.lightColor} border border-gray-200 dark:border-gray-700`}
                              style={{ width: 22, height: 22 }}
                            >
                              <Icon className={`h-3 w-3 ${meta.color}`} />
                            </div>
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                              {category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {items.length}
                            </span>
                            <motion.div
                              animate={{ rotate: isCollapsed ? -90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            </motion.div>
                          </div>
                        </motion.button>

                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-2 pb-2 space-y-0.5">
                                {items.map((node: any) => (
                                  <motion.button
                                    key={node.type}
                                    onClick={() => addStep(node.type)}
                                    className="w-full group"
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
                                          {node.label}
                                        </div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug truncate">
                                          {node.desc}
                                        </div>
                                      </div>

                                      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-all">
                                        <Plus className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
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

                {filteredNodes.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-14"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-3">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      No steps match
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Try a different search term
                    </p>
                    <motion.button
                      onClick={() => setSearchQuery("")}
                      whileTap={{ scale: 0.95 }}
                      className="mt-3 text-[10px] font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      Clear search
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <List className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

              <div>
                <div className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                  {workflowName}
                </div>
                <div className="text-[10px] text-gray-500">
                  {steps.length} {steps.length === 1 ? "step" : "steps"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowMonitor(true)}
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                Monitor
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowAIGenerator(true)}
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                AI Generate
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleSave}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>

              <Button
                size="sm"
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleRun}
                disabled={steps.length === 0}
              >
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Run
              </Button>
            </div>
          </motion.header>

          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 p-6">
            <div className="max-w-4xl mx-auto">
              {steps.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-gray-200 dark:border-gray-800 mb-6">
                    <List className="h-10 w-10 text-blue-600 dark:text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Build Your Workflow
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Add steps from the library or use AI to generate a complete
                    workflow
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setShowAIGenerator(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSidebarCollapsed(false)}
                      className="border-gray-200 dark:border-gray-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Steps Manually
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Workflow Timeline
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Steps execute sequentially from top to bottom
                      </p>
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={steps.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
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

                  <motion.button
                    onClick={() => setSidebarCollapsed(false)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Step</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>

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

      {/* Run Dashboard */}
      <motion.div
        className="absolute inset-0 bg-gray-50 dark:bg-gray-950"
        initial={{ x: "100%" }}
        animate={{ x: showDashboard ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {activeRunId && showDashboard && (
          <RunDashboard runId={activeRunId} onClose={handleBackToBuilder} />
        )}
      </motion.div>

      {/* Monitor Dashboard */}
      <motion.div
        className="absolute inset-0 bg-gray-50 dark:bg-gray-950"
        initial={{ x: "100%" }}
        animate={{ x: showMonitor ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {showMonitor && (
          <MonitorDashboard onClose={() => setShowMonitor(false)} />
        )}
      </motion.div>
    </div>
  );
}
