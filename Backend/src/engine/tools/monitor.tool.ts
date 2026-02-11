import { EventEmitter } from "events";
import { executeMCPTool } from "./mcpTools.registry";
import { runAILogAnalysis } from "./aiAnalyzer.tool";

// ====================================
// 📡 ENHANCED CONTINUOUS MONITOR
// ====================================

export type MonitorConfig = {
  targets: "containers" | "apis" | "resources";
  interval: number; // seconds
  alertOnChange: boolean;
  autoFix?: boolean;
  containerFilters?: string;
  apiEndpoints?: Array<{ url: string; expectedStatus: number }>;
  runId?: string; // For socket emission
};

export type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  severity: "HEALTHY" | "WARNING" | "CRITICAL";
  timestamp: string;
  httpHealthStatus?: {
    checked: boolean;
    healthy: boolean;
    statusCode?: number;
    responseTime?: number;
    checkedUrl?: string;
  };
  issues?: string[];
  logs?: string; // Real container logs
};

export type MonitorState = {
  isRunning: boolean;
  checkCount: number;
  lastCheck: string;
  alerts: Array<{
    timestamp: string;
    message: string;
    severity: "info" | "warning" | "critical";
    details: any;
  }>;
  containerMetrics?: Map<string, ContainerMetric>;
  autoFixesApplied?: number;
};

export class ContinuousMonitor extends EventEmitter {
  private config: MonitorConfig;
  private state: MonitorState;
  private intervalId?: NodeJS.Timeout;
  private previousState?: any;

  constructor(config: MonitorConfig) {
    super();
    this.config = config;
    this.state = {
      isRunning: false,
      checkCount: 0,
      lastCheck: "",
      alerts: [],
      containerMetrics: new Map(),
      autoFixesApplied: 0,
    };
  }

  async start() {
    if (this.state.isRunning) {
      throw new Error("Monitor already running");
    }

    this.state.isRunning = true;
    this.emit("started", { config: this.config });

    console.log("🚀 [Monitor] Starting continuous monitor");
    console.log(
      "📊 [Monitor] Check interval:",
      this.config.interval,
      "seconds",
    );

    // Run first check immediately
    await this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(async () => {
      await this.runCheck();
    }, this.config.interval * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.state.isRunning = false;
    this.emit("stopped", { state: this.state });
    console.log("🛑 [Monitor] Stopped");
  }

  getState(): MonitorState {
    return { ...this.state };
  }

  private async runCheck() {
    this.state.checkCount++;
    this.state.lastCheck = new Date().toISOString();

    console.log(
      `\n🔍 [Monitor] Check #${this.state.checkCount} at ${this.state.lastCheck}`,
    );

    try {
      switch (this.config.targets) {
        case "containers":
          await this.checkContainersEnhanced();
          break;
        case "apis":
          await this.checkAPIs();
          break;
        case "resources":
          await this.checkResources();
          break;
      }
    } catch (err: any) {
      console.error("❌ [Monitor] Check failed:", err.message);
      this.addAlert("critical", "Monitor check failed", {
        error: err.message,
      });
    }
  }

  private async checkContainersEnhanced() {
    console.log("🐳 [Monitor] Checking containers via Health Scanner...");

    try {
      // Step 1: Use Health Check Scanner to get container health
      const scanResult = await executeMCPTool("tool.healthCheckScanner", {
        scanAllRunning: true,
        timeout: 5000,
      });

      console.log("🏥 [Monitor] Health scan result:", {
        success: scanResult.success,
        scannedCount: scanResult.scannedCount,
        healthyCount: scanResult.healthyCount,
        unhealthyCount: scanResult.unhealthyCount,
      });

      if (!scanResult.success || !scanResult.reports) {
        throw new Error("Health check scanner failed");
      }

      const reports = scanResult.reports;

      // Step 2: Fetch logs for ALL containers via MCP
      console.log(
        `📝 [Monitor] Fetching logs for ${reports.length} containers...`,
      );

      const containerMetrics: ContainerMetric[] = await Promise.all(
        reports.map(async (report: any) => {
          try {
            // Fetch logs via MCP
            const logsResult = await executeMCPTool("tool.dockerLogs", {
              containerName: report.containerName,
              tail: 100,
              timestamps: true,
            });

            console.log(`📋 [Monitor] Logs for ${report.containerName}:`, {
              success: logsResult.success,
              hasLogs: !!logsResult.logs,
              logsLength: logsResult.logs?.length || 0,
            });

            // Determine severity based on health report
            const severity: "HEALTHY" | "WARNING" | "CRITICAL" =
              report.overallHealthy
                ? "HEALTHY"
                : report.applicationHealthy
                  ? "WARNING"
                  : "CRITICAL";

            return {
              containerName: report.containerName,
              dockerHealthy: report.containerRunning,
              applicationHealthy: report.applicationHealthy,
              cpuPercent: "0%", // Health scanner doesn't provide CPU/Mem stats
              memPercent: "0%",
              severity,
              timestamp: new Date().toISOString(),
              httpHealthStatus: report.httpHealthStatus,
              issues: report.issues,
              logs: logsResult.logs || "No logs available",
            };
          } catch (err: any) {
            console.error(
              `❌ [Monitor] Failed to process ${report.containerName}:`,
              err.message,
            );
            return {
              containerName: report.containerName,
              dockerHealthy: false,
              applicationHealthy: false,
              cpuPercent: "0%",
              memPercent: "0%",
              severity: "CRITICAL" as const,
              timestamp: new Date().toISOString(),
              issues: [`Failed to fetch data: ${err.message}`],
              logs: "Failed to fetch logs",
            };
          }
        }),
      );

      // Update state
      containerMetrics.forEach((metric) => {
        this.state.containerMetrics!.set(metric.containerName, metric);
      });

      console.log("✅ [Monitor] Processed all containers with logs");

      // Detect changes and trigger alerts
      if (this.previousState && this.config.alertOnChange) {
        await this.detectChangesAndAlert(containerMetrics);
      }

      this.previousState = { containers: containerMetrics };

      // Calculate counts
      const healthyCount = containerMetrics.filter(
        (m) => m.severity === "HEALTHY",
      ).length;
      const warningCount = containerMetrics.filter(
        (m) => m.severity === "WARNING",
      ).length;
      const criticalCount = containerMetrics.filter(
        (m) => m.severity === "CRITICAL",
      ).length;

      // Emit check completed event
      this.emit("check_completed", {
        type: "containers",
        result: {
          totalCount: containerMetrics.length,
          runningCount: containerMetrics.filter((m) => m.dockerHealthy).length,
          healthyCount,
          unhealthyCount: scanResult.unhealthyCount,
          containers: containerMetrics,
        },
        alerts: this.state.alerts.slice(-5),
      });

      // Auto-fix if enabled
      if (this.config.autoFix) {
        await this.autoFixUnhealthyContainers(containerMetrics);
      }
    } catch (err: any) {
      console.error("❌ [Monitor] Container check failed:", err.message);
      throw err;
    }
  }

  private async detectChangesAndAlert(currentMetrics: ContainerMetric[]) {
    const prev = this.previousState?.containers || [];
    const prevMap = new Map(prev.map((c: any) => [c.containerName, c]));

    for (const current of currentMetrics) {
      const previous: any = prevMap.get(current.containerName);

      if (!previous) {
        // New container detected
        this.addAlert(
          "info",
          `New container detected: ${current.containerName}`,
          {
            container: current.containerName,
          },
        );
        continue;
      }

      // Became unhealthy
      if (
        previous.severity === "HEALTHY" &&
        (current.severity === "WARNING" || current.severity === "CRITICAL")
      ) {
        this.addAlert(
          current.severity === "CRITICAL" ? "critical" : "warning",
          `Container became unhealthy: ${current.containerName}`,
          {
            container: current.containerName,
            previousSeverity: previous.severity,
            currentSeverity: current.severity,
            issues: current.issues,
          },
        );
      }

      // Recovered
      if (
        (previous.severity === "WARNING" || previous.severity === "CRITICAL") &&
        current.severity === "HEALTHY"
      ) {
        this.addAlert("info", `Container recovered: ${current.containerName}`, {
          container: current.containerName,
          previousSeverity: previous.severity,
        });
      }
    }
  }

  private async autoFixUnhealthyContainers(metrics: ContainerMetric[]) {
    const unhealthy = metrics.filter((m) => m.severity === "CRITICAL");

    if (unhealthy.length === 0) return;

    console.log(
      `🤖 [Monitor] Auto-fix enabled, found ${unhealthy.length} critical containers`,
    );

    for (const metric of unhealthy) {
      try {
        // AI Analysis
        const analysis = await runAILogAnalysis({
          logs: metric.logs || "",
          containerNames: [metric.containerName],
          context: "Auto-fix analysis",
        });

        console.log(`🧠 [Monitor] AI Analysis for ${metric.containerName}:`, {
          confidence: analysis.confidence,
          errorCategory: analysis.errorCategory,
        });

        // Only auto-fix if high confidence
        if (analysis.confidence === "high" && analysis.success) {
          console.log(
            `🔧 [Monitor] Attempting auto-fix for ${metric.containerName}`,
          );

          this.emit("auto_fix_attempted", {
            alert: {
              containerName: metric.containerName,
              analysis,
            },
            result: { starting: true },
          });

          // Restart container
          const restartResult = await executeMCPTool("tool.dockerRestart", {
            containerName: metric.containerName,
            timeout: 10,
          });

          if (restartResult.success) {
            this.state.autoFixesApplied!++;
            this.addAlert(
              "info",
              `Auto-fixed container: ${metric.containerName}`,
              {
                container: metric.containerName,
                action: "restart",
                analysis: analysis.summary,
              },
            );
          }
        } else {
          console.log(
            `⚠️ [Monitor] Skipping auto-fix for ${metric.containerName} (low confidence)`,
          );
        }
      } catch (err: any) {
        console.error(
          `❌ [Monitor] Auto-fix failed for ${metric.containerName}:`,
          err.message,
        );
      }
    }
  }

  private async checkAPIs() {
    if (!this.config.apiEndpoints || this.config.apiEndpoints.length === 0) {
      return;
    }

    const results = [];
    for (const endpoint of this.config.apiEndpoints) {
      try {
        const result = await executeMCPTool("tool.httpHealth", {
          url: endpoint.url,
          expectedStatus: endpoint.expectedStatus,
          timeout: 5000,
          retries: 1,
        });

        if (!result.pass) {
          this.addAlert(
            "critical",
            `API health check failed: ${endpoint.url}`,
            {
              statusCode: result.statusCode,
              error: result.error,
            },
          );
        }

        results.push(result);
      } catch (err: any) {
        console.error(
          `❌ [Monitor] API check failed for ${endpoint.url}:`,
          err.message,
        );
      }
    }

    this.emit("check_completed", {
      type: "apis",
      results,
      alerts: this.state.alerts.slice(-5),
    });
  }

  private async checkResources() {
    // Placeholder for system resource monitoring
    this.emit("check_completed", {
      type: "resources",
      message: "Resource monitoring not yet implemented",
    });
  }

  private addAlert(
    severity: "info" | "warning" | "critical",
    message: string,
    details: any,
  ) {
    const alert = {
      timestamp: new Date().toISOString(),
      message,
      severity,
      details,
    };

    this.state.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.state.alerts.length > 100) {
      this.state.alerts = this.state.alerts.slice(-100);
    }

    this.emit("alert", alert);
    console.log(`🚨 [Monitor] Alert (${severity}): ${message}`);
  }
}

// ====================================
// 🎯 MONITOR MANAGER (singleton)
// ====================================

class MonitorManager {
  private monitors: Map<string, ContinuousMonitor> = new Map();

  create(monitorId: string, config: MonitorConfig): ContinuousMonitor {
    if (this.monitors.has(monitorId)) {
      throw new Error(`Monitor ${monitorId} already exists`);
    }

    const monitor = new ContinuousMonitor(config);
    this.monitors.set(monitorId, monitor);
    return monitor;
  }

  get(monitorId: string): ContinuousMonitor | undefined {
    return this.monitors.get(monitorId);
  }

  stop(monitorId: string): boolean {
    const monitor = this.monitors.get(monitorId);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(monitorId);
      return true;
    }
    return false;
  }

  stopAll() {
    for (const [id, monitor] of this.monitors) {
      monitor.stop();
      this.monitors.delete(id);
    }
  }

  list(): string[] {
    return Array.from(this.monitors.keys());
  }
}

export const monitorManager = new MonitorManager();
