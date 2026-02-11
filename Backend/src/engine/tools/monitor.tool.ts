import { EventEmitter } from "events";
import { runDockerListAll } from "./docker.tool";
import { runHttpHealthCheck } from "./httpHealth.tool";
import { runDockerLogs } from "./docker.tool";
import { runAILogAnalysis } from "./aiAnalyzer.tool";
import { runDockerRestart } from "./docker.tool";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ====================================
// 🎯 ENHANCED MONITORING TYPES
// ====================================

export type ContainerHealthMetrics = {
  containerName: string;
  dockerHealthy: boolean;
  appHealthy: boolean;
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  diskIO: number;
  restartCount: number;
  uptime: number;
  ports: string[];
  issues: string[];
  severity: "healthy" | "warning" | "critical";
};

export type MonitorAlert = {
  id: string;
  timestamp: string;
  containerName: string;
  alertType:
    | "container_down"
    | "app_unhealthy"
    | "high_cpu"
    | "high_memory"
    | "high_restart_count"
    | "error_logs"
    | "network_issue"
    | "disk_issue";
  severity: "info" | "warning" | "critical";
  message: string;
  metrics: Partial<ContainerHealthMetrics>;
  autoFixAvailable: boolean;
  autoFixApplied?: boolean;
  aiAnalysis?: {
    rootCause: string;
    suggestedFixes: string[];
    confidence: "high" | "medium" | "low";
  };
};

export type MonitorConfig = {
  targets: "containers" | "apis" | "resources";
  interval: number; // seconds
  alertOnChange: boolean;
  autoFix?: boolean; // NEW: Enable AI auto-fix
  containerFilters?: string;
  apiEndpoints?: Array<{ url: string; expectedStatus: number }>;
  thresholds?: {
    cpu: number; // percentage
    memory: number; // percentage
    restartCount: number;
  };
};

export type MonitorState = {
  isRunning: boolean;
  checkCount: number;
  lastCheck: string;
  alerts: MonitorAlert[];
  containerMetrics: Map<string, ContainerHealthMetrics>;
  autoFixesApplied: number;
};

// ====================================
// 🔍 ADVANCED CONTAINER METRICS COLLECTOR
// ====================================

async function collectContainerMetrics(
  containerName: string,
): Promise<ContainerHealthMetrics> {
  const metrics: Partial<ContainerHealthMetrics> = {
    containerName,
    issues: [],
    severity: "healthy",
  };

  try {
    // 1. Get container inspect data
    const { stdout: inspectData } = await execAsync(
      `docker inspect ${containerName}`,
    );
    const container = JSON.parse(inspectData)[0];

    // Docker health status
    metrics.dockerHealthy = container.State?.Running === true;
    metrics.uptime = container.State?.Running
      ? Date.now() - new Date(container.State.StartedAt).getTime()
      : 0;
    metrics.restartCount = container.RestartCount || 0;

    // Port mappings
    metrics.ports = [];
    if (container.NetworkSettings?.Ports) {
      Object.entries(container.NetworkSettings.Ports).forEach(
        ([containerPort, hostBindings]: [string, any]) => {
          if (hostBindings && Array.isArray(hostBindings)) {
            hostBindings.forEach((binding: any) => {
              if (binding.HostPort) {
                metrics.ports!.push(`${binding.HostPort}->${containerPort}`);
              }
            });
          }
        },
      );
    }

    // 2. Get real-time stats
    const { stdout: statsData } = await execAsync(
      `docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}"`,
    );

    const [cpu, mem, memUsage, netIO, blockIO] = statsData.trim().split(",");

    metrics.cpuUsage = parseFloat(cpu.replace("%", ""));
    metrics.memoryUsage = parseFloat(mem.replace("%", ""));

    // Parse memory usage (e.g., "150MiB / 2GiB")
    const memMatch = memUsage.match(
      /([\d.]+)([A-Za-z]+)\s*\/\s*([\d.]+)([A-Za-z]+)/,
    );
    if (memMatch) {
      const used = parseFloat(memMatch[1]);
      const limit = parseFloat(memMatch[3]);
      metrics.memoryLimit = limit;
    }

    // Parse network I/O (e.g., "1.2MB / 3.4MB")
    const netMatch = netIO.match(
      /([\d.]+)([A-Za-z]+)\s*\/\s*([\d.]+)([A-Za-z]+)/,
    );
    if (netMatch) {
      metrics.networkRx = parseFloat(netMatch[1]);
      metrics.networkTx = parseFloat(netMatch[3]);
    }

    // Parse disk I/O
    const diskMatch = blockIO.match(/([\d.]+)([A-Za-z]+)/);
    if (diskMatch) {
      metrics.diskIO = parseFloat(diskMatch[1]);
    }

    // 3. Application-level health check
    metrics.appHealthy = await checkApplicationHealth(
      containerName,
      metrics.ports || [],
    );

    // 4. Analyze logs for errors
    const { stdout: logsData } = await execAsync(
      `docker logs ${containerName} --tail 100 2>&1`,
    );

    const errorPatterns = [
      /error/i,
      /exception/i,
      /fatal/i,
      /crash/i,
      /failed/i,
      /timeout/i,
    ];

    const recentErrors = logsData
      .split("\n")
      .filter((line) => errorPatterns.some((pattern) => pattern.test(line)))
      .slice(-10);

    if (recentErrors.length > 5) {
      metrics.issues!.push(
        `High error rate: ${recentErrors.length} errors in last 100 lines`,
      );
    }

    // 5. Determine severity
    if (!metrics.dockerHealthy || !metrics.appHealthy) {
      metrics.severity = "critical";
    } else if (
      metrics.cpuUsage! > 80 ||
      metrics.memoryUsage! > 80 ||
      metrics.restartCount! > 3 ||
      recentErrors.length > 5
    ) {
      metrics.severity = "warning";
    } else {
      metrics.severity = "healthy";
    }

    return metrics as ContainerHealthMetrics;
  } catch (err: any) {
    return {
      containerName,
      dockerHealthy: false,
      appHealthy: false,
      cpuUsage: 0,
      memoryUsage: 0,
      memoryLimit: 0,
      networkRx: 0,
      networkTx: 0,
      diskIO: 0,
      restartCount: 0,
      uptime: 0,
      ports: [],
      issues: [`Failed to collect metrics: ${err.message}`],
      severity: "critical",
    };
  }
}

async function checkApplicationHealth(
  containerName: string,
  ports: string[],
): Promise<boolean> {
  if (ports.length === 0) return true;

  const healthPaths = ["/health", "/healthz", "/api/health", "/"];

  for (const portMapping of ports) {
    const hostPort = parseInt(portMapping.split("->")[0]);

    for (const path of healthPaths) {
      try {
        const axios = require("axios");
        const response = await axios.get(
          `http://localhost:${hostPort}${path}`,
          {
            timeout: 3000,
            validateStatus: () => true,
          },
        );

        if (response.status >= 200 && response.status < 300) {
          if (typeof response.data === "object") {
            const status = response.data.status || response.data.health;
            if (status) {
              const statusStr = String(status).toLowerCase();
              if (
                statusStr === "unhealthy" ||
                statusStr === "down" ||
                statusStr === "error"
              ) {
                return false;
              }
            }
          }
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  return false;
}

// ====================================
// 🤖 AI AUTO-FIX ENGINE
// ====================================

async function attemptAutoFix(
  alert: MonitorAlert,
  containerName: string,
): Promise<{
  success: boolean;
  action: string;
  details: string;
}> {
  console.log(`🤖 [AutoFix] Attempting auto-fix for ${containerName}`);
  console.log(`🤖 [AutoFix] Alert type: ${alert.alertType}`);

  try {
    switch (alert.alertType) {
      case "container_down":
      case "app_unhealthy": {
        // Restart container
        console.log(`🔄 [AutoFix] Restarting container: ${containerName}`);
        const result = await runDockerRestart({
          containerName,
          timeout: 10,
        });

        if (result.success) {
          // Wait for container to stabilize
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Verify fix
          const metrics = await collectContainerMetrics(containerName);
          if (metrics.dockerHealthy && metrics.appHealthy) {
            return {
              success: true,
              action: "container_restart",
              details: "Container restarted successfully and is now healthy",
            };
          }
        }
        return {
          success: false,
          action: "container_restart",
          details: "Restart failed or container still unhealthy",
        };
      }

      case "high_memory": {
        // Restart to clear memory
        console.log(
          `💾 [AutoFix] Restarting to clear memory: ${containerName}`,
        );
        const result = await runDockerRestart({
          containerName,
          timeout: 10,
        });

        if (result.success) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const metrics = await collectContainerMetrics(containerName);
          if (metrics.memoryUsage < 70) {
            return {
              success: true,
              action: "memory_restart",
              details: `Memory usage reduced from ${alert.metrics.memoryUsage}% to ${metrics.memoryUsage}%`,
            };
          }
        }
        return {
          success: false,
          action: "memory_restart",
          details: "Memory issue persists after restart",
        };
      }

      case "error_logs": {
        // Analyze logs with AI and attempt restart
        console.log(`🧠 [AutoFix] Analyzing logs with AI: ${containerName}`);
        const logsResult = await runDockerLogs({
          containerName,
          tail: 200,
        });

        if (logsResult.success) {
          const aiAnalysis = await runAILogAnalysis({
            logs: logsResult.logs,
            context: `Auto-fix analysis for ${containerName}`,
          });

          if (
            aiAnalysis.confidence === "high" &&
            aiAnalysis.suggestedFixes.some((fix) =>
              fix.toLowerCase().includes("restart"),
            )
          ) {
            const result = await runDockerRestart({
              containerName,
              timeout: 10,
            });

            if (result.success) {
              return {
                success: true,
                action: "ai_guided_restart",
                details: `AI recommended restart: ${aiAnalysis.rootCause}`,
              };
            }
          }
        }
        return {
          success: false,
          action: "ai_analysis",
          details: "AI analysis completed but no automatic fix available",
        };
      }

      default:
        return {
          success: false,
          action: "none",
          details: `No auto-fix available for alert type: ${alert.alertType}`,
        };
    }
  } catch (err: any) {
    console.error(`❌ [AutoFix] Error:`, err.message);
    return {
      success: false,
      action: "error",
      details: `Auto-fix failed: ${err.message}`,
    };
  }
}

// ====================================
// 📡 ENHANCED CONTINUOUS MONITOR
// ====================================

export class ContinuousMonitor extends EventEmitter {
  private config: MonitorConfig;
  private state: MonitorState;
  private intervalId?: NodeJS.Timeout;
  private previousMetrics: Map<string, ContainerHealthMetrics>;

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
    this.previousMetrics = new Map();
  }

  async start() {
    if (this.state.isRunning) {
      throw new Error("Monitor already running");
    }

    this.state.isRunning = true;
    this.emit("started", { config: this.config });

    console.log("🔍 [Monitor] Starting continuous monitoring");
    console.log("🔍 [Monitor] Auto-fix enabled:", this.config.autoFix);

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

    console.log("🛑 [Monitor] Monitoring stopped");
    console.log(`📊 [Monitor] Total checks: ${this.state.checkCount}`);
    console.log(
      `🤖 [Monitor] Auto-fixes applied: ${this.state.autoFixesApplied}`,
    );
  }

  getState(): MonitorState {
    return {
      ...this.state,
      containerMetrics: new Map(this.state.containerMetrics),
    };
  }

  private async runCheck() {
    this.state.checkCount++;
    this.state.lastCheck = new Date().toISOString();

    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `🔍 [Monitor] Check #${this.state.checkCount} - ${new Date().toLocaleTimeString()}`,
    );
    console.log(`${"=".repeat(60)}\n`);

    try {
      switch (this.config.targets) {
        case "containers":
          await this.checkContainers();
          break;
        case "apis":
          await this.checkAPIs();
          break;
        case "resources":
          await this.checkResources();
          break;
      }
    } catch (err: any) {
      this.addAlert({
        containerName: "monitor",
        alertType: "network_issue",
        severity: "critical",
        message: "Monitor check failed",
        metrics: {},
        autoFixAvailable: false,
        id: "",
        timestamp: "",
      });
    }

    this.emit("check_completed", {
      checkCount: this.state.checkCount,
      alerts: this.state.alerts.slice(-10),
      metrics: Array.from(this.state.containerMetrics.values()),
    });
  }

  private async checkContainers() {
    // Get all running containers
    const result = await runDockerListAll({
      filters: this.config.containerFilters,
      includeStats: false,
    });

    if (!result.success) {
      console.error("❌ [Monitor] Failed to list containers");
      return;
    }

    const runningContainers = result.containers.filter(
      (c) => c.status === "running",
    );

    console.log(`📦 [Monitor] Scanning ${runningContainers.length} containers`);

    for (const container of runningContainers) {
      await this.analyzeContainer(container.name);
    }

    console.log(`\n✅ [Monitor] Check completed`);
    console.log(`   Total containers: ${runningContainers.length}`);
    console.log(
      `   Healthy: ${Array.from(this.state.containerMetrics.values()).filter((m) => m.severity === "healthy").length}`,
    );
    console.log(
      `   Warning: ${Array.from(this.state.containerMetrics.values()).filter((m) => m.severity === "warning").length}`,
    );
    console.log(
      `   Critical: ${Array.from(this.state.containerMetrics.values()).filter((m) => m.severity === "critical").length}`,
    );
  }

  private async analyzeContainer(containerName: string) {
    console.log(`\n🔬 [Monitor] Analyzing: ${containerName}`);

    const metrics = await collectContainerMetrics(containerName);
    const previous = this.previousMetrics.get(containerName);

    this.state.containerMetrics.set(containerName, metrics);
    this.previousMetrics.set(containerName, metrics);

    console.log(`   Docker: ${metrics.dockerHealthy ? "✅" : "❌"}`);
    console.log(`   App: ${metrics.appHealthy ? "✅" : "❌"}`);
    console.log(`   CPU: ${metrics.cpuUsage.toFixed(1)}%`);
    console.log(`   Memory: ${metrics.memoryUsage.toFixed(1)}%`);
    console.log(`   Severity: ${metrics.severity.toUpperCase()}`);

    // Detect issues and create alerts
    await this.detectIssues(containerName, metrics, previous);
  }

  private async detectIssues(
    containerName: string,
    current: ContainerHealthMetrics,
    previous?: ContainerHealthMetrics,
  ) {
    const thresholds = this.config.thresholds || {
      cpu: 80,
      memory: 80,
      restartCount: 3,
    };

    // Container down
    if (!current.dockerHealthy) {
      await this.handleAlert({
        containerName,
        alertType: "container_down",
        severity: "critical",
        message: `Container is not running`,
        metrics: current,
        autoFixAvailable: true,
      });
    }

    // App unhealthy
    if (current.dockerHealthy && !current.appHealthy) {
      await this.handleAlert({
        containerName,
        alertType: "app_unhealthy",
        severity: "critical",
        message: `Application health check failing`,
        metrics: current,
        autoFixAvailable: true,
      });
    }

    // High CPU
    if (current.cpuUsage > thresholds.cpu) {
      await this.handleAlert({
        containerName,
        alertType: "high_cpu",
        severity: current.cpuUsage > 90 ? "critical" : "warning",
        message: `High CPU usage: ${current.cpuUsage.toFixed(1)}%`,
        metrics: current,
        autoFixAvailable: false,
      });
    }

    // High memory
    if (current.memoryUsage > thresholds.memory) {
      await this.handleAlert({
        containerName,
        alertType: "high_memory",
        severity: current.memoryUsage > 90 ? "critical" : "warning",
        message: `High memory usage: ${current.memoryUsage.toFixed(1)}%`,
        metrics: current,
        autoFixAvailable: true,
      });
    }

    // High restart count
    if (current.restartCount > thresholds.restartCount) {
      await this.handleAlert({
        containerName,
        alertType: "high_restart_count",
        severity: "warning",
        message: `Container has restarted ${current.restartCount} times`,
        metrics: current,
        autoFixAvailable: false,
      });
    }

    // Error logs
    if (current.issues.length > 0) {
      await this.handleAlert({
        containerName,
        alertType: "error_logs",
        severity: "warning",
        message: `Errors detected: ${current.issues.join(", ")}`,
        metrics: current,
        autoFixAvailable: true,
      });
    }
  }

  private async handleAlert(alertData: Omit<MonitorAlert, "id" | "timestamp">) {
    const alert: MonitorAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...alertData,
    };

    console.log(`\n🚨 [Monitor] ALERT: ${alert.message}`);
    console.log(`   Severity: ${alert.severity.toUpperCase()}`);
    console.log(
      `   Auto-fix available: ${alert.autoFixAvailable ? "YES" : "NO"}`,
    );

    // Attempt auto-fix if enabled
    if (
      this.config.autoFix &&
      alert.autoFixAvailable &&
      alert.severity === "critical"
    ) {
      console.log(`🤖 [Monitor] Attempting auto-fix...`);

      const fixResult = await attemptAutoFix(alert, alert.containerName);

      alert.autoFixApplied = fixResult.success;

      console.log(
        `   Result: ${fixResult.success ? "✅ SUCCESS" : "❌ FAILED"}`,
      );
      console.log(`   Action: ${fixResult.action}`);
      console.log(`   Details: ${fixResult.details}`);

      if (fixResult.success) {
        this.state.autoFixesApplied++;
      }

      this.emit("auto_fix_attempted", {
        alert,
        result: fixResult,
      });
    }

    this.addAlert(alert);
    this.emit("alert", alert);
  }

  private async checkAPIs() {
    if (!this.config.apiEndpoints || this.config.apiEndpoints.length === 0) {
      return;
    }

    const results = [];
    for (const endpoint of this.config.apiEndpoints) {
      const result = await runHttpHealthCheck({
        url: endpoint.url,
        expectedStatus: endpoint.expectedStatus,
        timeout: 5000,
        retries: 1,
      });

      if (!result.pass) {
        this.addAlert({
          containerName: "api-monitor",
          alertType: "app_unhealthy",
          severity: "critical",
          message: `API health check failed: ${endpoint.url}`,
          metrics: { statusCode: result.statusCode } as any,
          autoFixAvailable: false,
          id: "",
          timestamp: "",
        });
      }

      results.push(result);
    }

    this.emit("check_completed", {
      type: "apis",
      results,
      alerts: this.state.alerts.slice(-5),
    });
  }

  private async checkResources() {
    // System resource monitoring placeholder
    this.emit("check_completed", {
      type: "resources",
      message: "Resource monitoring not yet implemented",
    });
  }

  private addAlert(alert: MonitorAlert) {
    this.state.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.state.alerts.length > 1000) {
      this.state.alerts = this.state.alerts.slice(-1000);
    }
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

  getAll(): Map<string, ContinuousMonitor> {
    return this.monitors;
  }
}

export const monitorManager = new MonitorManager();
