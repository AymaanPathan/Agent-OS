/* eslint-disable @typescript-eslint/no-explicit-any */

export type WorkflowPattern = {
  id: string;
  name: string;
  icon: string;
  category:
    | "incident"
    | "performance"
    | "ai-analysis"
    | "deployment"
    | "monitoring"
    | "logs";
  detectionRules: {
    tools?: string[];
    keywords?: string[];
    nodeTypes?: string[];
    outputPatterns?: string[];
  };
  dashboardComponents: string[];
  metrics: string[];
  insights: string[];
};

export const WORKFLOW_PATTERNS: WorkflowPattern[] = [
  {
    id: "incident-recovery",
    name: "Incident Recovery",
    icon: "🔥",
    category: "incident",
    detectionRules: {
      tools: ["Docker Restart", "Docker Rollback", "Health Check Scanner"],
      keywords: ["crash", "down", "fail", "error", "500", "incident", "broke"],
      nodeTypes: ["tool.dockerRestart", "tool.dockerRollback"],
    },
    dashboardComponents: [
      "IncidentTimeline",
      "RecoveryActions",
      "HealthStatus",
    ],
    metrics: ["downtime", "recoveryTime", "affectedServices"],
    insights: ["rootCause", "impactAnalysis", "preventionSuggestions"],
  },
  {
    id: "performance-analysis",
    name: "Performance Analysis",
    icon: "⚡",
    category: "performance",
    detectionRules: {
      keywords: [
        "latency",
        "slow",
        "performance",
        "bottleneck",
        "response time",
        "spike",
      ],
      tools: ["AI Log Analyzer", "HTTP Health Check"],
      outputPatterns: ["latency", "responseTime", "slowQuery"],
    },
    dashboardComponents: [
      "LatencyGraph",
      "SlowEndpoints",
      "PerformanceMetrics",
    ],
    metrics: ["avgLatency", "p95Latency", "slowQueries"],
    insights: ["performanceBottlenecks", "optimizationSuggestions"],
  },
  {
    id: "ai-autofix",
    name: "AI Auto-Fix",
    icon: "🤖",
    category: "ai-analysis",
    detectionRules: {
      tools: ["AI Log Analyzer"],
      nodeTypes: ["agent.aiAnalyzer", "logic.approval"],
      keywords: ["analyze", "recommend", "confidence", "root cause", "ai"],
    },
    dashboardComponents: [
      "AIAnalysis",
      "ConfidenceScore",
      "RecommendedActions",
    ],
    metrics: ["aiConfidence", "analysisTime", "fixesApplied"],
    insights: ["rootCauseAnalysis", "aiRecommendations", "riskAssessment"],
  },
  {
    id: "deployment-safety",
    name: "Safe Deployment",
    icon: "🚀",
    category: "deployment",
    detectionRules: {
      keywords: ["deploy", "rollback", "version", "release"],
      tools: ["Docker Rollback", "Health Check Scanner"],
      nodeTypes: ["tool.dockerRollback", "logic.approval"],
    },
    dashboardComponents: ["RecoveryActions", "HealthStatus"],
    metrics: ["deploymentTime", "successRate", "rollbackCount"],
    insights: ["deploymentRisks", "healthTrends"],
  },
  {
    id: "log-investigation",
    name: "Log Investigation",
    icon: "🔍",
    category: "logs",
    detectionRules: {
      tools: ["Docker Logs", "Bulk Fetch Logs", "AI Log Analyzer"],
      keywords: ["investigate", "logs", "trace", "debug", "find"],
    },
    dashboardComponents: ["LogViewer", "ErrorPatterns"],
    metrics: ["logVolume", "errorRate", "uniqueErrors"],
    insights: ["errorPatterns", "suspiciousActivity"],
  },
  {
    id: "health-monitoring",
    name: "Health Monitoring",
    icon: "🏥",
    category: "monitoring",
    detectionRules: {
      tools: [
        "Health Check Scanner",
        "HTTP Health Check",
        "Docker Status",
        "List All Containers",
      ],
      keywords: ["health", "monitor", "check", "status", "unhealthy"],
    },
    dashboardComponents: ["HealthStatus", "PerformanceMetrics"],
    metrics: ["uptime", "healthScore", "failureRate"],
    insights: ["healthTrends", "failurePredictions"],
  },
];

export class WorkflowClassifier {
  detectPatterns(
    logs: any[],
    containers: any[],
    healthReports: any[],
  ): WorkflowPattern[] {
    const matchedPatterns: Map<
      string,
      { pattern: WorkflowPattern; score: number }
    > = new Map();

    for (const pattern of WORKFLOW_PATTERNS) {
      let score = 0;

      // Check tools used
      if (pattern.detectionRules.tools) {
        const toolsUsed = logs.map((l) => l.toolName).filter(Boolean);
        const toolMatches = pattern.detectionRules.tools.filter((t) =>
          toolsUsed.some((used) => used.includes(t)),
        );
        score += toolMatches.length * 5;
      }

      // Check keywords in messages
      if (pattern.detectionRules.keywords) {
        const allText = logs.map((l) => l.message.toLowerCase()).join(" ");
        const keywordMatches = pattern.detectionRules.keywords.filter((k) =>
          allText.includes(k.toLowerCase()),
        );
        score += keywordMatches.length * 2;
      }

      // Check node types
      if (pattern.detectionRules.nodeTypes) {
        const nodeTypes = logs.map((l) => l.type).filter(Boolean);
        const nodeMatches = pattern.detectionRules.nodeTypes.filter((nt) =>
          nodeTypes.some((type) => type.includes(nt)),
        );
        score += nodeMatches.length * 3;
      }

      // If score is significant, add pattern
      if (score >= 2) {
        matchedPatterns.set(pattern.id, { pattern, score });
      }
    }

    // Sort by score descending
    return Array.from(matchedPatterns.values())
      .sort((a, b) => b.score - a.score)
      .map(({ pattern }) => pattern);
  }

  extractMetrics(
    pattern: WorkflowPattern,
    logs: any[],
    context: any,
  ): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const metric of pattern.metrics) {
      switch (metric) {
        case "downtime":
          metrics.downtime = this.calculateDowntime(logs);
          break;
        case "recoveryTime":
          metrics.recoveryTime = this.calculateRecoveryTime(logs);
          break;
        case "avgLatency":
          metrics.avgLatency = this.calculateAvgLatency(logs);
          break;
        case "aiConfidence":
          metrics.aiConfidence = this.extractAIConfidence(logs);
          break;
        case "healthScore":
          metrics.healthScore = this.calculateHealthScore(context);
          break;
        case "affectedServices":
          metrics.affectedServices = this.countAffectedServices(logs);
          break;
        case "errorRate":
          metrics.errorRate = this.calculateErrorRate(logs);
          break;
        default:
          metrics[metric] = 0;
      }
    }

    return metrics;
  }

  private calculateDowntime(logs: any[]): number {
    const failureLog = logs.find((l) => l.level === "error");
    const recoveryLog = logs.find(
      (l) =>
        l.level === "success" &&
        (l.message.includes("recover") || l.message.includes("restart")),
    );

    if (!failureLog || !recoveryLog) return 0;

    return (
      new Date(recoveryLog.timestamp).getTime() -
      new Date(failureLog.timestamp).getTime()
    );
  }

  private calculateRecoveryTime(logs: any[]): number {
    const restartLog = logs.find((l) => l.toolName?.includes("Restart"));
    if (!restartLog) return 0;
    return restartLog.duration || 0;
  }

  private calculateAvgLatency(logs: any[]): number {
    const latencyLogs = logs.filter(
      (l) => l.output?.latency || l.output?.responseTime,
    );
    if (latencyLogs.length === 0) return 0;

    const total = latencyLogs.reduce(
      (sum, l) => sum + (l.output.latency || l.output.responseTime || 0),
      0,
    );
    return Math.round(total / latencyLogs.length);
  }

  private extractAIConfidence(logs: any[]): string {
    const aiLog = logs.find((l) => l.toolName === "AI Log Analyzer");
    return aiLog?.output?.confidence || "unknown";
  }

  private calculateHealthScore(context: any): number {
    const total = context.vars?.totalContainers || 0;
    const healthy = context.vars?.healthyContainers || 0;
    return total > 0 ? Math.round((healthy / total) * 100) : 100;
  }

  private countAffectedServices(logs: any[]): number {
    const services = new Set<string>();
    logs.forEach((l) => {
      if (l.output?.containerName) services.add(l.output.containerName);
      if (l.output?.containers) {
        l.output.containers.forEach((c: any) => services.add(c.name));
      }
    });
    return services.size;
  }

  private calculateErrorRate(logs: any[]): number {
    const totalLogs = logs.length;
    const errorLogs = logs.filter((l) => l.level === "error").length;
    return totalLogs > 0 ? Math.round((errorLogs / totalLogs) * 100) : 0;
  }
}
