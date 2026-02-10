/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { nodeConfigs } from "@/lib/nodeConfigs";
import { nodeOutputSchema } from "@/lib/nodeOutputs";
import {
  getFallbackRoutes,
  supportsFallbackRouting,
  FallbackRoute,
} from "@/lib/Nodefallbackroutes.frontend";
import { Button } from "@/components/ui/button";
import {
  X,
  Settings,
  Sparkles,
  Code,
  Copy,
  Check,
  Trash2,
  GitBranch,
  Plus,
  ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StepConfigPanel({
  step,
  allSteps,
  onClose,
  onChange,
  onDelete,
}: {
  step: any;
  allSteps: any[];
  onClose: () => void;
  onChange: (step: any) => void;
  onDelete: (stepId: string) => void;
}) {
  const schema = nodeConfigs[step.data.nodeType];
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [showFallbackRoutes, setShowFallbackRoutes] = useState(false);

  if (!schema) return null;

  const config = step.data.config ?? {};
  const fallbackRoutes = config.fallbackRoutes || [];
  const defaultRoute = config.defaultRoute;

  const update = (key: string, value: any) => {
    onChange({
      ...step,
      data: {
        ...step.data,
        config: {
          ...config,
          [key]: value,
        },
      },
    });
  };

  const insertVariable = (fieldKey: string, variable: string) => {
    const currentVal = String(config[fieldKey] || "");
    const newVal = currentVal ? currentVal + " " + variable : variable;
    update(fieldKey, newVal);
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Get previous steps (steps before current one)
  const currentIndex = allSteps.findIndex((s) => s.id === step.id);
  const previousSteps = currentIndex > 0 ? allSteps.slice(0, currentIndex) : [];

  // Get available routes (steps after current one)
  const availableRoutes =
    currentIndex < allSteps.length - 1 ? allSteps.slice(currentIndex + 1) : [];

  const supportsFallbacks = supportsFallbackRouting(step.data.nodeType);
  const availableFallbackRoutes = getFallbackRoutes(step.data.nodeType);

  const addFallbackRoute = (route: FallbackRoute) => {
    const newRoute = { ...route, targetStepId: "" };
    const currentRoutes = config.fallbackRoutes || [];
    update("fallbackRoutes", [...currentRoutes, newRoute]);
  };

  const updateFallbackRoute = (index: number, targetStepId: string) => {
    const currentRoutes = [...(config.fallbackRoutes || [])];
    currentRoutes[index] = { ...currentRoutes[index], targetStepId };
    update("fallbackRoutes", currentRoutes);
  };

  const removeFallbackRoute = (index: number) => {
    const currentRoutes = [...(config.fallbackRoutes || [])];
    currentRoutes.splice(index, 1);
    update("fallbackRoutes", currentRoutes);
  };

  return (
    <motion.div
      initial={{ x: 440 }}
      animate={{ x: 0 }}
      exit={{ x: 440 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-14 z-50 h-[calc(100vh-56px)] w-[440px] border-l border-gray-800 bg-[#111113] shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gradient-to-r from-[#1a1a1d] to-[#111113] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 shadow-lg shadow-blue-900/30">
            <Settings className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-100">
              {schema.title}
            </div>
            <div className="text-xs text-gray-400">{step.data.label}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(step.id)}
            className="rounded-lg p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
            title="Delete step"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-800 transition text-gray-400 hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Configuration Fields */}
        {schema.fields.map((field) => {
          const value =
            config[field.key] ??
            field.default ??
            (field.type === "boolean" ? false : "");

          const showVariableInserter =
            field.type === "text" || field.type === "textarea";

          return (
            <div key={field.key} className="space-y-2.5">
              {/* Label + Variable Inserter */}
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  {field.label}
                </label>

                {showVariableInserter && previousSteps.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-950 text-blue-400 hover:bg-blue-900 transition font-medium border border-blue-900">
                        <Sparkles className="h-3.5 w-3.5" />
                        Variables
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-96 p-0 bg-[#1a1a1d] border-gray-800"
                      align="end"
                    >
                      <div className="p-4 border-b border-gray-800 bg-[#111113]">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-blue-400" />
                          <div className="text-sm font-semibold text-gray-100">
                            Insert Dynamic Variable
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Reference data from previous steps
                        </div>
                      </div>

                      <div className="max-h-[400px] overflow-auto p-3 space-y-3">
                        {previousSteps.map((s) => {
                          const nodeType = s.data?.nodeType;
                          const outputs = nodeOutputSchema[nodeType] || [];

                          if (outputs.length === 0) {
                            return (
                              <div
                                key={s.id}
                                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800"
                              >
                                <div className="text-xs font-medium text-gray-400">
                                  {s.data?.label || s.id}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  No outputs available
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={s.id}
                              className="border border-gray-800 rounded-lg overflow-hidden bg-[#1a1a1d]"
                            >
                              <div className="px-3 py-2 bg-gray-900 border-b border-gray-800">
                                <div className="text-xs font-medium text-gray-200">
                                  {s.data?.label || s.id}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {nodeType}
                                </div>
                              </div>

                              <div className="p-1 space-y-0.5">
                                {outputs.map((o: any) => {
                                  const templateVar = `{{step.${s.id}.${o.path}}}`;
                                  return (
                                    <VariableButton
                                      key={o.path}
                                      label={o.label}
                                      value={templateVar}
                                      description={o.description}
                                      small
                                      copied={copiedVar === templateVar}
                                      onCopy={() => copyVariable(templateVar)}
                                      onClick={() =>
                                        insertVariable(field.key, templateVar)
                                      }
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Helper Text */}
              {field.helperText && (
                <div className="text-xs text-gray-500 flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-400" />
                  <span>{field.helperText}</span>
                </div>
              )}

              {/* Field Input */}
              {field.type === "text" && (
                <input
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-900/30 transition font-mono"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-900/30 transition font-mono"
                  rows={4}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-900/30 transition"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, Number(e.target.value))}
                />
              )}

              {field.type === "select" && (
                <select
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-900/30 transition"
                  value={value}
                  onChange={(e) => update(field.key, e.target.value)}
                >
                  <option value="" className="bg-gray-900">
                    Select an option
                  </option>
                  {field.options?.map((opt: any) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-gray-900"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "boolean" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => update(field.key, !value)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      value ? "bg-blue-600" : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                        value ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <span className="text-sm text-gray-400">
                    {value ? "Enabled" : "Disabled"}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Fallback Routing Section */}
        {supportsFallbacks && availableRoutes.length > 0 && (
          <div className="border-t border-gray-800 pt-5 mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-purple-400" />
                <div className="text-sm font-semibold text-gray-100">
                  Fallback Routes
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {fallbackRoutes.length} configured
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-4">
              Define what happens based on this step output
            </div>

            {/* Configured Routes */}
            <div className="space-y-2 mb-3">
              <AnimatePresence>
                {fallbackRoutes.map((route: any, index: number) => {
                  const routeTemplate = availableFallbackRoutes.find(
                    (r) => r.id === route.id,
                  );
                  if (!routeTemplate) return null;

                  const getSeverityColor = (severity: string) => {
                    switch (severity) {
                      case "success":
                        return "bg-green-900/30 border-green-700/50 text-green-300";
                      case "warning":
                        return "bg-yellow-900/30 border-yellow-700/50 text-yellow-300";
                      case "error":
                        return "bg-red-900/30 border-red-700/50 text-red-300";
                      default:
                        return "bg-blue-900/30 border-blue-700/50 text-blue-300";
                    }
                  };

                  return (
                    <motion.div
                      key={`${route.id}-${index}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`rounded-lg border p-3 ${getSeverityColor(routeTemplate.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg mt-0.5">
                          {routeTemplate.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-200 mb-1">
                            {routeTemplate.label}
                          </div>
                          <div className="text-xs text-gray-400 mb-3">
                            {routeTemplate.description}
                          </div>

                          <select
                            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200"
                            value={route.targetStepId || ""}
                            onChange={(e) =>
                              updateFallbackRoute(index, e.target.value)
                            }
                          >
                            <option value="">Select target step...</option>
                            {availableRoutes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.data?.label || s.id}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => removeFallbackRoute(index)}
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add Route Button */}
            <Popover
              open={showFallbackRoutes}
              onOpenChange={setShowFallbackRoutes}
            >
              <PopoverTrigger asChild>
                <button className="w-full rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-600/50 bg-gray-900/50 hover:bg-purple-950/20 px-4 py-3 text-sm font-medium text-gray-400 hover:text-purple-300 transition flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Fallback Route
                </button>
              </PopoverTrigger>

              <PopoverContent
                className="w-80 p-0 bg-[#1a1a1d] border-gray-800"
                align="end"
              >
                <div className="p-4 border-b border-gray-800 bg-[#111113]">
                  <div className="text-sm font-semibold text-gray-100">
                    Available Routes
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Choose a condition to add
                  </div>
                </div>

                <div className="max-h-96 overflow-auto p-2">
                  {availableFallbackRoutes
                    .filter(
                      (r) => !fallbackRoutes.some((fr: any) => fr.id === r.id),
                    )
                    .map((route) => {
                      const getSeverityColor = (severity: string) => {
                        switch (severity) {
                          case "success":
                            return "hover:bg-green-950/30 border-green-800/30";
                          case "warning":
                            return "hover:bg-yellow-950/30 border-yellow-800/30";
                          case "error":
                            return "hover:bg-red-950/30 border-red-800/30";
                          default:
                            return "hover:bg-blue-950/30 border-blue-800/30";
                        }
                      };

                      return (
                        <button
                          key={route.id}
                          onClick={() => {
                            addFallbackRoute(route);
                            setShowFallbackRoutes(false);
                          }}
                          className={`w-full text-left rounded-lg border p-3 mb-2 transition ${getSeverityColor(route.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base">{route.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-200 mb-1">
                                {route.label}
                              </div>
                              <div className="text-xs text-gray-400">
                                {route.description}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Default Route */}
            <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800">
              <div className="text-xs font-medium text-gray-400 mb-2">
                Default Route (if no conditions match)
              </div>
              <select
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200"
                value={defaultRoute || ""}
                onChange={(e) => update("defaultRoute", e.target.value)}
              >
                <option value="">Continue to next step</option>
                {availableRoutes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data?.label || s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-[#1a1a1d] p-4">
        <Button
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 transition"
          onClick={onClose}
        >
          Save & Close
        </Button>
      </div>
    </motion.div>
  );
}

// ====================================
// VARIABLE BUTTON COMPONENT
// ====================================

function VariableButton({
  label,
  value,
  description,
  small,
  copied,
  onCopy,
  onClick,
}: {
  label: string;
  value: string;
  description?: string;
  small?: boolean;
  copied?: boolean;
  onCopy: () => void;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`w-full text-left rounded-lg hover:bg-gray-800 transition ${
          small ? "px-2 py-1.5" : "px-3 py-2"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div
              className={`font-medium text-gray-200 ${small ? "text-xs" : "text-sm"}`}
            >
              {label}
            </div>
            {description && (
              <div className="text-[10px] text-gray-500 mt-0.5">
                {description}
              </div>
            )}
          </div>
          <div
            className={`font-mono text-gray-500 group-hover:text-blue-400 transition ${
              small ? "text-[10px]" : "text-xs"
            }`}
          >
            {value}
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700 transition-all"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3 text-gray-400" />
        )}
      </button>
    </div>
  );
}
