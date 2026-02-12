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
  ChevronDown,
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
      className="fixed right-0 top-14 z-50 h-[calc(100vh-56px)] w-[440px] border-l border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar))] shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--border))] surface-elevated px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[rgb(var(--primary))] p-2.5 shadow-lg shadow-[rgb(var(--primary))]/20">
            <Settings className="h-4 w-4 text-[rgb(var(--primary-foreground))]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
              {schema.title}
            </div>
            <div className="text-xs text-[rgb(var(--foreground-muted))]">
              {step.data.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(step.id)}
            className="rounded-lg p-2 hover:bg-[rgb(var(--error))]/20 text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--error))] transition"
            title="Delete step"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:surface transition text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
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
                <label className="block text-sm font-medium text-[rgb(var(--foreground))]">
                  {field.label}
                </label>

                {showVariableInserter && previousSteps.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/20 transition font-medium border border-[rgb(var(--primary))]/30">
                        <Sparkles className="h-3.5 w-3.5" />
                        Variables
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-96 p-0 bg-[rgb(var(--surface-elevated))] border-[rgb(var(--border))]"
                      align="end"
                    >
                      <div className="p-4 border-b border-[rgb(var(--border))] surface">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-[rgb(var(--primary))]" />
                          <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                            Insert Dynamic Variable
                          </div>
                        </div>
                        <div className="text-xs text-[rgb(var(--foreground-muted))] mt-1">
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
                                className="px-3 py-2 rounded-lg surface border border-[rgb(var(--border))]"
                              >
                                <div className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                                  {s.data?.label || s.id}
                                </div>
                                <div className="text-[11px] text-[rgb(var(--foreground-subtle))] mt-0.5">
                                  No outputs available
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={s.id}
                              className="border border-[rgb(var(--border))] rounded-lg overflow-hidden surface-elevated"
                            >
                              <div className="px-3 py-2 surface border-b border-[rgb(var(--border))]">
                                <div className="text-xs font-medium text-[rgb(var(--foreground))]">
                                  {s.data?.label || s.id}
                                </div>
                                <div className="text-[10px] text-[rgb(var(--foreground-subtle))]">
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
                <div className="text-xs text-[rgb(var(--foreground-muted))] flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-[rgb(var(--primary))]" />
                  <span>{field.helperText}</span>
                </div>
              )}

              {/* Field Input */}
              {field.type === "text" && (
                <input
                  className="w-full rounded-lg border border-[rgb(var(--border))] surface-elevated px-4 py-2.5 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30 transition font-mono"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  className="w-full resize-none rounded-lg border border-[rgb(var(--border))] surface-elevated px-4 py-2.5 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30 transition font-mono"
                  rows={4}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  className="w-full rounded-lg border border-[rgb(var(--border))] surface-elevated px-4 py-2.5 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30 transition"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, Number(e.target.value))}
                />
              )}

              {field.type === "select" && (
                <select
                  className="w-full rounded-lg border border-[rgb(var(--border))] surface-elevated px-4 py-2.5 text-sm text-[rgb(var(--foreground))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30 transition"
                  value={value}
                  onChange={(e) => update(field.key, e.target.value)}
                >
                  <option value="" className="surface-elevated">
                    Select an option
                  </option>
                  {field.options?.map((opt: any) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="surface-elevated"
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
                      value
                        ? "bg-[rgb(var(--primary))]"
                        : "bg-[rgb(var(--border))]"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                        value ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <span className="text-sm text-[rgb(var(--foreground-muted))]">
                    {value ? "Enabled" : "Disabled"}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Fallback Routing Section */}
        {/* Fallback Routing Section */}
        {supportsFallbacks && availableRoutes.length > 0 && (
          <div className="border-t border-[rgb(var(--border))] pt-5 mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 flex items-center justify-center">
                  <GitBranch className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  Fallback Routes
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-full surface text-[10px] font-medium text-[rgb(var(--foreground-subtle))]">
                {fallbackRoutes.length} configured
              </div>
            </div>

            <div className="text-xs text-[rgb(var(--foreground-muted))] mb-4 leading-relaxed">
              Define conditional paths based on this step&apos;s output
            </div>

            {/* Configured Routes */}
            <div className="space-y-2 mb-3">
              <AnimatePresence>
                {fallbackRoutes.map((route: any, index: number) => {
                  const routeTemplate = availableFallbackRoutes.find(
                    (r) => r.id === route.id,
                  );
                  if (!routeTemplate) return null;

                  const getSeverityStyles = (severity: string) => {
                    switch (severity) {
                      case "success":
                        return {
                          border: "border-[rgb(var(--success))]/20",
                          bg: "bg-[rgb(var(--success))]/5",
                          icon: "text-[rgb(var(--success))]",
                          iconBg: "bg-[rgb(var(--success))]/10",
                        };
                      case "warning":
                        return {
                          border: "border-[rgb(var(--warning))]/20",
                          bg: "bg-[rgb(var(--warning))]/5",
                          icon: "text-[rgb(var(--warning))]",
                          iconBg: "bg-[rgb(var(--warning))]/10",
                        };
                      case "error":
                        return {
                          border: "border-[rgb(var(--error))]/20",
                          bg: "bg-[rgb(var(--error))]/5",
                          icon: "text-[rgb(var(--error))]",
                          iconBg: "bg-[rgb(var(--error))]/10",
                        };
                      default:
                        return {
                          border: "border-[rgb(var(--primary))]/20",
                          bg: "bg-[rgb(var(--primary))]/5",
                          icon: "text-[rgb(var(--primary))]",
                          iconBg: "bg-[rgb(var(--primary))]/10",
                        };
                    }
                  };

                  const styles = getSeverityStyles(routeTemplate.severity);

                  return (
                    <motion.div
                      key={`${route.id}-${index}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`rounded-lg border ${styles.border} ${styles.bg} overflow-hidden`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-7 h-7 rounded-lg ${styles.iconBg} flex items-center justify-center`}
                          >
                            <span className={`text-base ${styles.icon}`}>
                              {routeTemplate.icon}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[rgb(var(--foreground))] mb-1">
                              {routeTemplate.label}
                            </div>
                            <div className="text-xs text-[rgb(var(--foreground-muted))] mb-3 leading-relaxed">
                              {routeTemplate.description}
                            </div>

                            <div className="relative">
                              <select
                                className="w-full rounded-lg border border-[rgb(var(--border))] surface-elevated px-3 py-2 pr-8 text-xs text-[rgb(var(--foreground))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] transition-all appearance-none cursor-pointer"
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
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--foreground-subtle))] pointer-events-none" />
                            </div>
                          </div>

                          <button
                            onClick={() => removeFallbackRoute(index)}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:surface text-[rgb(var(--foreground-subtle))] hover:text-[rgb(var(--error))] transition-all"
                            title="Remove route"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full rounded-lg border-2 border-dashed border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/50 surface-elevated hover:bg-[rgb(var(--primary))]/5 px-4 py-3 text-sm font-medium text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--primary))] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Fallback Route
                </motion.button>
              </PopoverTrigger>

              <PopoverContent
                className="w-80 p-0 bg-[rgb(var(--surface-elevated))] border-[rgb(var(--border))] rounded-lg shadow-xl"
                align="end"
              >
                <div className="p-4 border-b border-[rgb(var(--border))] surface">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
                    <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                      Available Routes
                    </div>
                  </div>
                  <div className="text-xs text-[rgb(var(--foreground-muted))]">
                    Choose a condition to add
                  </div>
                </div>

                <div className="max-h-96 overflow-auto p-2">
                  {availableFallbackRoutes
                    .filter(
                      (r) => !fallbackRoutes.some((fr: any) => fr.id === r.id),
                    )
                    .map((route) => {
                      const getSeverityStyles = (severity: string) => {
                        switch (severity) {
                          case "success":
                            return {
                              hover:
                                "hover:bg-[rgb(var(--success))]/5 hover:border-[rgb(var(--success))]/20",
                              icon: "text-[rgb(var(--success))]",
                              iconBg: "bg-[rgb(var(--success))]/10",
                            };
                          case "warning":
                            return {
                              hover:
                                "hover:bg-[rgb(var(--warning))]/5 hover:border-[rgb(var(--warning))]/20",
                              icon: "text-[rgb(var(--warning))]",
                              iconBg: "bg-[rgb(var(--warning))]/10",
                            };
                          case "error":
                            return {
                              hover:
                                "hover:bg-[rgb(var(--error))]/5 hover:border-[rgb(var(--error))]/20",
                              icon: "text-[rgb(var(--error))]",
                              iconBg: "bg-[rgb(var(--error))]/10",
                            };
                          default:
                            return {
                              hover:
                                "hover:bg-[rgb(var(--primary))]/5 hover:border-[rgb(var(--primary))]/20",
                              icon: "text-[rgb(var(--primary))]",
                              iconBg: "bg-[rgb(var(--primary))]/10",
                            };
                        }
                      };

                      const styles = getSeverityStyles(route.severity);

                      return (
                        <motion.button
                          key={route.id}
                          onClick={() => {
                            addFallbackRoute(route);
                            setShowFallbackRoutes(false);
                          }}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left rounded-lg border border-[rgb(var(--border))] surface-elevated p-3 mb-2 transition-all ${styles.hover}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`flex-shrink-0 w-7 h-7 rounded-lg ${styles.iconBg} flex items-center justify-center`}
                            >
                              <span className={`text-base ${styles.icon}`}>
                                {route.icon}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[rgb(var(--foreground))] mb-1">
                                {route.label}
                              </div>
                              <div className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                                {route.description}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[rgb(var(--foreground-subtle))] flex-shrink-0 mt-0.5" />
                          </div>
                        </motion.button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Default Route */}
            <div className="mt-4 p-3 rounded-lg surface-elevated border border-[rgb(var(--border))]">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                  Default Route
                </div>
                <div className="px-1.5 py-0.5 rounded text-[9px] font-medium surface border border-[rgb(var(--border-subtle))] text-[rgb(var(--foreground-subtle))]">
                  Fallback
                </div>
              </div>
              <div className="text-[10px] text-[rgb(var(--foreground-subtle))] mb-2 leading-relaxed">
                Used when no conditions match
              </div>
              <div className="relative">
                <select
                  className="w-full rounded-lg border border-[rgb(var(--border))] surface px-3 py-2 pr-8 text-xs text-[rgb(var(--foreground))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] transition-all appearance-none cursor-pointer"
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
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--foreground-subtle))] pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[rgb(var(--border))] surface-elevated p-4">
        <Button
          className="w-full rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] transition"
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
        className={`w-full text-left rounded-lg hover:surface-elevated transition-all duration-200 ${
          small ? "px-2 py-1.5" : "px-3 py-2"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div
              className={`font-medium text-[rgb(var(--foreground))] ${small ? "text-xs" : "text-sm"}`}
            >
              {label}
            </div>
            {description && (
              <div className="text-[10px] text-[rgb(var(--foreground-subtle))] mt-0.5">
                {description}
              </div>
            )}
          </div>
          {/* ✅ FIX: Add proper text wrapping and truncation */}
          <div
            className={`font-mono text-[rgb(var(--foreground-subtle))] group-hover:text-[rgb(var(--primary))] transition-colors break-all ${
              small ? "text-[10px]" : "text-xs"
            } max-w-[140px]`}
            title={value} // Show full value on hover
          >
            {value}
          </div>
        </div>
      </button>

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: copied ? 1 : 0,
          scale: copied ? 1 : 0.8,
        }}
        whileHover={{ scale: 1.05 }}
        className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-100 p-1.5 rounded-md surface-elevated hover:surface border border-[rgb(var(--border))] transition-all shadow-sm"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="h-3 w-3 text-[rgb(var(--success))]" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Copy className="h-3 w-3 text-[rgb(var(--foreground-muted))]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
