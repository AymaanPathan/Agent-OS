import { EventEmitter } from "events";
import { runDockerListAll } from "./docker.tool";
import { runHttpHealthCheck } from "./httpHealth.tool";

// ====================================
// 🔡 CONTINUOUS MONITOR WITH ENHANCED METRICS
// ====================================

export type MonitorConfig = {
  targets: "containers" | "apis" | "resources";
  interval: number; // seconds
  alertOnChange: boolean;
  autoFix?: boolean;
  containerFilters?: string;
  apiEndpoints?: Array<{ url: string; expectedStatus: number }>;
  runId?: string;
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

    console.log("👁️ [Monitor] Starting continuous monitor");
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
  }

  getState(): MonitorState {
    return { ...this.state };
  }

  private async runCheck() {
    this.state.checkCount++;
    this.state.lastCheck = new Date().toISOString();

    console.log(
      "\n============================================================",
    );
    console.log(
      `🔍 [Monitor] Check #${this.state.checkCount} - ${new Date().toLocaleTimeString()}`,
    );
    console.log(
      "============================================================\n",
    );

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
      this.addAlert("critical", "Monitor check failed", {
        error: err.message,
      });
    }
  }

  private async checkContainers() {
    const result = await runDockerListAll({
      filters: this.config.containerFilters,
      includeStats: true,
      checkApplicationHealth: true,
    });

    console.log(
      `📦 [Monitor] Scanning ${result.containers.length} containers\n`,
    );

    // Build detailed container metrics
    const metrics = new Map<string, ContainerMetric>();
    const metricsArray: ContainerMetric[] = [];

    for (const container of result.containers) {
      const isDockerHealthy = container.status === "running";
      const isAppHealthy = container.applicationHealthy !== false;

      // Determine issues
      const issues: string[] = [];
      if (!isDockerHealthy) {
        issues.push(`Container not running (status: ${container.status})`);
      }
      if (container.health && container.health !== "healthy") {
        issues.push(`Docker health: ${container.health}`);
      }
      if (!isAppHealthy) {
        issues.push("Application health check failed");
      }

      // Determine severity
      const cpuValue = parseFloat(container.cpuPercent || "0");
      const memValue = parseFloat(container.memPercent || "0");
      const severity: "HEALTHY" | "WARNING" | "CRITICAL" =
        !isDockerHealthy || !isAppHealthy
          ? "CRITICAL"
          : cpuValue > 80 || memValue > 80
            ? "WARNING"
            : "HEALTHY";

      const metric: ContainerMetric = {
        containerName: container.name,
        dockerHealthy: isDockerHealthy,
        applicationHealthy: isAppHealthy,
        cpuPercent: container.cpuPercent || "0%",
        memPercent: container.memPercent || "0%",
        severity,
        timestamp: new Date().toISOString(),
        issues: issues.length > 0 ? issues : undefined,
      };

      metrics.set(container.name, metric);
      metricsArray.push(metric);

      // Console output
      console.log(`🔬 [Monitor] Analyzing: ${container.name}`);
      console.log(`   Docker: ${isDockerHealthy ? "✅" : "❌"}`);
      console.log(`   App: ${isAppHealthy ? "✅" : "❌"}`);
      console.log(`   CPU: ${container.cpuPercent || "N/A"}`);
      console.log(`   Memory: ${container.memPercent || "N/A"}`);
      console.log(`   Severity: ${severity}\n`);

      // Alert on unhealthy containers
      if (!isDockerHealthy) {
        this.addAlert("critical", "Container not running", {
          containerName: container.name,
          status: container.status,
          autoFixAvailable: this.config.autoFix,
        });
      } else if (!isAppHealthy) {
        this.addAlert("critical", "Application health check failing", {
          containerName: container.name,
          autoFixAvailable: this.config.autoFix,
        });
      } else if (cpuValue > 80) {
        this.addAlert("warning", `High CPU usage: ${container.name}`, {
          cpu: container.cpuPercent,
        });
      } else if (memValue > 80) {
        this.addAlert("warning", `High memory usage: ${container.name}`, {
          memory: container.memPercent,
        });
      }
    }

    this.state.containerMetrics = metrics;

    // Detect changes from previous state
    if (this.previousState && this.config.alertOnChange) {
      const prev = this.previousState as typeof result;

      // New unhealthy containers
      const newUnhealthy =
        (result.unhealthyContainers as string[] | undefined)?.filter(
          (name) =>
            !(prev.unhealthyContainers as string[] | undefined)?.includes(name),
        ) ?? [];

      if (newUnhealthy.length > 0) {
        this.addAlert("critical", "Containers became unhealthy", {
          containers: newUnhealthy,
          totalUnhealthy: result.unhealthyCount,
        });
      }

      // Containers recovered
      const recovered =
        (prev.unhealthyContainers as string[] | undefined)?.filter(
          (name) =>
            !(result.unhealthyContainers as string[] | undefined)?.includes(
              name,
            ),
        ) ?? [];

      if (recovered.length > 0) {
        this.addAlert("info", "Containers recovered", {
          containers: recovered,
          totalHealthy: result.healthyCount,
        });
      }
    }

    this.previousState = result;

    console.log("✅ [Monitor] Check completed");
    console.log(`   Total containers: ${result.containers.length}`);
    console.log(`   Healthy: ${result.healthyCount}`);
    console.log(
      `   Warning: ${metricsArray.filter((m) => m.severity === "WARNING").length}`,
    );
    console.log(`   Critical: ${result.unhealthyCount}`);

    // Emit check completed event with enhanced metrics
    this.emit("check_completed", {
      type: "containers",
      result,
      metrics: metricsArray,
      alerts: this.state.alerts.slice(-5),
      timestamp: new Date().toISOString(),
      checkNumber: this.state.checkCount,
    });
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
        this.addAlert("critical", `API health check failed: ${endpoint.url}`, {
          statusCode: result.statusCode,
          error: result.error,
        });
      }

      results.push(result);
    }

    this.emit("check_completed", {
      type: "apis",
      results,
      alerts: this.state.alerts.slice(-5),
      timestamp: new Date().toISOString(),
      checkNumber: this.state.checkCount,
    });
  }

  private async checkResources() {
    this.emit("check_completed", {
      type: "resources",
      message: "Resource monitoring not yet implemented",
      timestamp: new Date().toISOString(),
      checkNumber: this.state.checkCount,
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

    console.log(`🚨 [Monitor] ALERT: ${message}`);
    console.log(`   Severity: ${severity.toUpperCase()}`);
    console.log(
      `   Auto-fix available: ${details.autoFixAvailable ? "YES" : "NO"}`,
    );
    console.log(`🚨 [Monitor] Alert: ${message}\n`);

    this.state.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.state.alerts.length > 100) {
      this.state.alerts = this.state.alerts.slice(-100);
    }

    this.emit("alert", alert);
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
