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
  LayoutGrid,
  Moon,
  Sun,
  Activity,
  Zap,
  Wrench,
  ShieldCheck,
  Users,
  Settings,
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
import StepConfigPanel from "@/components/StepConfigPanel";
import { useTheme } from "@/components/ThemeProvider";


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
  "Agent Swarms": Users,
};

const categoryMeta: Record<string, { color: string; bg: string }> = {
  Triggers: {
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  Tools: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  "Logic & Safety": {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  Agents: {
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
  },
  "Agent Swarms": {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
};

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
        <div className="absolute left-6 -top-3 w-px h-3 bg-[rgb(var(--border))]" />
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        onClick={onClick}
        className={`group relative rounded-lg border transition-all cursor-pointer ${
          selected
            ? "border-[rgb(var(--primary))] surface-elevated shadow-sm shadow-[rgb(var(--primary))]/20"
            : "border-[rgb(var(--border))] surface-elevated hover:border-[rgb(var(--border-subtle))]"
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-[rgb(var(--foreground-subtle))]" />
        </div>

        <div className="p-3.5 pl-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-md surface border border-[rgb(var(--border))] flex items-center justify-center">
              <span className="text-xs font-semibold text-[rgb(var(--foreground-muted))]">
                {index + 1}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                  {step.data?.label || "Unnamed Step"}
                </span>
              </div>
              <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
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
                          className="text-[10px] px-2 py-0.5 rounded surface border border-[rgb(var(--border-subtle))] text-[rgb(var(--foreground-muted))]"
                        >
                          {key}:{" "}
                          {typeof value === "object"
                            ? "•"
                            : String(value).slice(0, 15)}
                        </span>
                      ))}
                    {Object.keys(step.data.config).length > 2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded surface text-[rgb(var(--foreground-subtle))]">
                        +{Object.keys(step.data.config).length - 2}
                      </span>
                    )}
                  </div>
                )}
            </div>

            <ChevronRight className="h-4 w-4 text-[rgb(var(--foreground-subtle))] flex-shrink-0" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BuilderPage() {
  const { theme, toggleTheme } = useTheme();
  const [selectedStep, setSelectedStep] = useState<any | null>(null);
  const [showDockerDialog, setShowDockerDialog] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
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
      style: { strokeWidth: 2, stroke: "rgb(var(--border))" },
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
    <div className="relative h-screen w-screen overflow-hidden bg-[rgb(var(--background))]">
      <AIWorkflowGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onWorkflowGenerated={handleAIWorkflowGenerated}
      />

      <motion.div
        className="absolute inset-0 flex"
        animate={{ x: showDashboard ? "-100%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Sidebar */}
        <motion.div
          className="h-full border-r border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar))] flex flex-col"
          animate={{ width: sidebarCollapsed ? 0 : 280 }}
          transition={{ duration: 0.2 }}
        >
          {!sidebarCollapsed && (
            <>
              <div className="border-b border-[rgb(var(--sidebar-border))] surface p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-[rgb(var(--primary))]">
                    <LayoutGrid className="h-3.5 w-3.5 text-[rgb(var(--primary-foreground))]" />
                  </div>
                  <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    Step Library
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--foreground-subtle))]" />
                  <input
                    type="text"
                    placeholder="Search steps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[rgb(var(--border))] surface-elevated pl-9 pr-8 py-2 text-xs text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:surface"
                    >
                      <X className="h-3 w-3 text-[rgb(var(--foreground-subtle))]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3">
                {!searchQuery && (
                  <div className="border-t border-[rgb(var(--border-subtle))] mb-3" />
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
                        className="rounded-lg overflow-hidden border border-[rgb(var(--border))] surface-elevated"
                      >
                        <motion.button
                          onClick={() => toggleCategory(category)}
                          whileTap={{ scale: 0.99 }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:surface transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex items-center justify-center rounded-md ${meta.bg} border border-[rgb(var(--border))]`}
                              style={{ width: 20, height: 20 }}
                            >
                              <Icon className={`h-3 w-3 ${meta.color}`} />
                            </div>
                            <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
                              {category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full surface text-[rgb(var(--foreground-muted))]">
                              {items.length}
                            </span>
                            <motion.div
                              animate={{ rotate: isCollapsed ? -90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-3.5 w-3.5 text-[rgb(var(--foreground-subtle))]" />
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
                                    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:surface border border-transparent hover:border-[rgb(var(--border))] transition-all">
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-medium text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))] transition-colors">
                                          {node.label}
                                        </div>
                                        <div className="text-[10px] text-[rgb(var(--foreground-muted))] leading-snug truncate">
                                          {node.desc}
                                        </div>
                                      </div>

                                      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-transparent group-hover:surface transition-all">
                                        <Plus className="h-3 w-3 text-[rgb(var(--foreground-subtle))] group-hover:text-[rgb(var(--primary))]" />
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
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl surface border border-[rgb(var(--border))] mb-3">
                      <Search className="h-5 w-5 text-[rgb(var(--foreground-subtle))]" />
                    </div>
                    <p className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                      No steps match
                    </p>
                    <p className="text-[10px] text-[rgb(var(--foreground-subtle))] mt-0.5">
                      Try a different search term
                    </p>
                    <motion.button
                      onClick={() => setSearchQuery("")}
                      whileTap={{ scale: 0.95 }}
                      className="mt-3 text-[10px] font-medium text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))]"
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
            className="flex h-14 items-center justify-between border-b border-[rgb(var(--border))] surface-elevated px-6"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:surface transition-colors"
              >
                <LayoutGrid className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
              </button>

              <div className="h-5 w-px bg-[rgb(var(--border))]" />

              <div>
                <div className="text-sm text-[rgb(var(--foreground))] font-semibold">
                  {workflowName}
                </div>
                <div className="text-[10px] text-[rgb(var(--foreground-subtle))]">
                  {steps.length} {steps.length === 1 ? "step" : "steps"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:surface transition-colors"
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
                ) : (
                  <Moon className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
                )}
              </button>

              <div className="h-5 w-px bg-[rgb(var(--border))]" />

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDockerDialog(true)}
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Docker Settings
              </Button>
{/* 
              <DockerConnectionModal
                isOpen={showDockerDialog}
                onClose={() => setShowDockerDialog(false)}
                onConnected={

                }
              /> */}

              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-[rgb(var(--border))] bg-transparent hover:surface"
                onClick={() => setShowAIGenerator(true)}
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                AI Generate
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-[rgb(var(--border))] bg-transparent hover:surface"
                onClick={handleSave}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>

              <Button
                size="sm"
                className="h-8 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))]"
                onClick={handleRun}
                disabled={steps.length === 0}
              >
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Run
              </Button>
            </div>
          </motion.header>

          <div className="flex-1 overflow-auto bg-[rgb(var(--background))] p-6">
            <div className="max-w-4xl mx-auto">
              {steps.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl surface-elevated border border-[rgb(var(--border))] mb-6">
                    <LayoutGrid className="h-10 w-10 text-[rgb(var(--primary))]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
                    Build Your Workflow
                  </h2>
                  <p className="text-[rgb(var(--foreground-muted))] mb-6 max-w-md mx-auto">
                    Add steps from the library or use AI to generate a complete
                    workflow
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setShowAIGenerator(true)}
                      className="bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))]"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSidebarCollapsed(false)}
                      className="border-[rgb(var(--border))]"
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
                      <h2 className="text-lg font-bold text-[rgb(var(--foreground))]">
                        Workflow Timeline
                      </h2>
                      <p className="text-xs text-[rgb(var(--foreground-subtle))] mt-1">
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
                    className="w-full p-4 rounded-lg border-2 border-dashed border-[rgb(var(--border))] hover:border-[rgb(var(--primary))] surface-elevated hover:surface transition-all flex items-center justify-center gap-2 text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--primary))]"
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
        className="absolute inset-0 bg-[rgb(var(--background))]"
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
