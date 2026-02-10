/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { WorkflowClassifier, WorkflowPattern } from "@/lib/workflowClassifier";
import { motion } from "framer-motion";

// Import all specialized components
import { IncidentTimeline } from "./components/IncidentTimeline";
import { RecoveryActions } from "./components/smallComponents";
import { HealthStatus } from "./components/smallComponents";
import { LatencyGraph } from "./components/smallComponents";
import { SlowEndpoints } from "./components/smallComponents";
import { PerformanceMetrics } from "./components/smallComponents";
import { AIAnalysis } from "./components/AIAnalysis";
import { ConfidenceScore } from "./components/smallComponents";
import { RecommendedActions } from "./components/smallComponents";
import { LogViewer } from "./components/smallComponents";
import { ErrorPatterns } from "./components/smallComponents";

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  IncidentTimeline,
  RecoveryActions,
  HealthStatus,
  LatencyGraph,
  SlowEndpoints,
  PerformanceMetrics,
  AIAnalysis,
  ConfidenceScore,
  RecommendedActions,
  LogViewer,
  ErrorPatterns,
};

interface DynamicDashboardProps {
  logs: any[];
  containers: any[];
  healthReports: any[];
  context: any;
}

export function DynamicDashboard({
  logs,
  containers,
  healthReports,
  context,
}: DynamicDashboardProps) {
  const classifier = useMemo(() => new WorkflowClassifier(), []);

  const patterns = useMemo(
    () => classifier.detectPatterns(logs, containers, healthReports),
    [logs, containers, healthReports, classifier],
  );

  const primaryPattern = patterns[0];

  if (!primaryPattern) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <div className="text-4xl mb-4">🤖</div>
        <p className="text-sm font-medium">Analyzing workflow pattern...</p>
        <p className="text-xs mt-1 text-zinc-600">
          Execute more workflow steps to see intelligent insights
        </p>
      </div>
    );
  }

  const patternMetrics = classifier.extractMetrics(
    primaryPattern,
    logs,
    context,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Pattern Header */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{primaryPattern.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-white">
              {primaryPattern.name}
            </h2>
            <p className="text-sm text-zinc-400">
              Workflow Pattern Detected • {primaryPattern.category}
            </p>
          </div>
        </div>

        {/* Pattern Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(patternMetrics).map(([key, value]) => (
            <div key={key} className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="text-lg font-bold text-white">
                {formatMetricValue(key, value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {primaryPattern.dashboardComponents.map((componentName) => {
          const Component = COMPONENT_REGISTRY[componentName];
          if (!Component) {
            console.warn(`Component ${componentName} not found in registry`);
            return null;
          }

          return (
            <Component
              key={componentName}
              logs={logs}
              containers={containers}
              healthReports={healthReports}
              context={context}
              metrics={patternMetrics}
            />
          );
        })}
      </div>

      {/* Additional Patterns */}
      {patterns.length > 1 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-zinc-300">
            Related Workflow Patterns
          </h3>
          <div className="flex flex-wrap gap-2">
            {patterns.slice(1).map((pattern) => (
              <div
                key={pattern.id}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 flex items-center gap-2"
              >
                <span>{pattern.icon}</span>
                {pattern.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function formatMetricValue(key: string, value: any): string {
  if (typeof value === "number") {
    if (key.includes("Time") || key.includes("downtime")) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    if (key.includes("Score") || key.includes("Rate")) {
      return `${value}%`;
    }
    if (key.includes("Latency")) {
      return `${value}ms`;
    }
    return value.toLocaleString();
  }
  return String(value);
}
