import { EventEmitter } from "events";
import { runDockerListAll } from "./docker.tool";
import { runHttpHealthCheck } from "./httpHealth.tool";

// ====================================
// 📡 CONTINUOUS MONITOR
// ====================================

export type MonitorConfig = {
  targets: "containers" | "apis" | "resources";
  interval: number; // seconds
  alertOnChange: boolean;
  containerFilters?: string;
  apiEndpoints?: Array<{ url: string; expectedStatus: number }>;
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
    };
  }

  async start() {
    if (this.state.isRunning) {
      throw new Error("Monitor already running");
    }

    this.state.isRunning = true;
    this.emit("started", { config: this.config });

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
    });

    // Detect changes
    if (this.previousState && this.config.alertOnChange) {
      const prev = this.previousState as typeof result;

      // New unhealthy containers
      const newUnhealthy = (result.unhealthyContainers as string[] | undefined)?.filter(
        (name) => !((prev.unhealthyContainers as string[] | undefined)?.includes(name)),
      ) ?? [];

      if (newUnhealthy.length > 0) {
        this.addAlert("critical", "Containers became unhealthy", {
          containers: newUnhealthy,
          totalUnhealthy: result.unhealthyCount,
        });
      }

      // Containers recovered
      const recovered = ((prev.unhealthyContainers as string[] | undefined)?.filter(
        (name) => !((result.unhealthyContainers as string[] | undefined)?.includes(name)),
      )) ?? [];

      if (recovered.length > 0) {
        this.addAlert("info", "Containers recovered", {
          containers: recovered,
          totalHealthy: result.healthyCount,
        });
      }

      // High resource usage
      for (const container of result.containers) {
        if (container.cpuPercent && parseFloat(container.cpuPercent) > 80) {
          this.addAlert("warning", `High CPU usage: ${container.name}`, {
            cpu: container.cpuPercent,
          });
        }
        if (container.memPercent && parseFloat(container.memPercent) > 80) {
          this.addAlert("warning", `High memory usage: ${container.name}`, {
            memory: container.memPercent,
          });
        }
      }
    }

    this.previousState = result;
    this.emit("check_completed", {
      type: "containers",
      result,
      alerts: this.state.alerts.slice(-5), // Last 5 alerts
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
    });
  }

  private async checkResources() {
    // Placeholder for system resource monitoring
    // Could check disk usage, memory, CPU, etc.
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
