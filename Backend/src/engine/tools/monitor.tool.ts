import { EventEmitter } from "events";
import { runDockerListAll } from "./docker.tool";
import { runHttpHealthCheck } from "./httpHealth.tool";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ====================================
// 📡 CONTINUOUS MONITOR (FIXED)
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
  logs?: string;
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

/**
 * Get container ports
 */
async function getContainerPorts(containerName: string): Promise<number[]> {
  try {
    const { stdout } = await execAsync(`docker inspect ${containerName}`);
    const containers = JSON.parse(stdout);

    if (!containers || containers.length === 0) {
      return [];
    }

    const container = containers[0];
    const ports: number[] = [];

    if (container.NetworkSettings?.Ports) {
      Object.entries(container.NetworkSettings.Ports).forEach(
        ([, hostBindings]: [string, any]) => {
          if (hostBindings && Array.isArray(hostBindings)) {
            hostBindings.forEach((binding: any) => {
              if (binding.HostPort) {
                ports.push(parseInt(binding.HostPort));
              }
            });
          }
        },
      );
    }

    return ports;
  } catch (err) {
    return [];
  }
}

/**
 * Check HTTP health for a container
 */
async function checkHTTPHealth(
  containerName: string,
  ports: number[],
  timeout: number = 3000,
): Promise<{
  checked: boolean;
  healthy: boolean;
  statusCode?: number;
  responseTime?: number;
  checkedUrl?: string;
}> {
  if (ports.length === 0) {
    return { checked: false, healthy: true }; // ✅ No ports = not an error
  }

  const axios = require("axios");
  const healthPaths = ["/health", "/healthz", "/"];

  for (const port of ports) {
    for (const path of healthPaths) {
      const url = `http://localhost:${port}${path}`;
      const startTime = Date.now();

      try {
        const response = await axios.get(url, {
          timeout,
          validateStatus: () => true,
        });

        const responseTime = Date.now() - startTime;

        // ✅ Check for explicit unhealthy status in body
        let isHealthy = response.status >= 200 && response.status < 300;

        if (isHealthy && typeof response.data === "object") {
          const status = response.data.status || response.data.health;
          if (status) {
            const statusStr = String(status).toLowerCase();
            if (
              statusStr === "unhealthy" ||
              statusStr === "down" ||
              statusStr === "error" ||
              response.data.ok === false
            ) {
              isHealthy = false;
            }
          }
        }

        return {
          checked: true,
          healthy: isHealthy,
          statusCode: response.status,
          responseTime,
          checkedUrl: url,
        };
      } catch (err) {
        continue;
      }
    }
  }

  return {
    checked: true,
    healthy: false,
  };
}

/**
 * Fetch container logs
 */
async function fetchContainerLogs(
  containerName: string,
  tail: number = 100,
): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(
      `docker logs --tail ${tail} ${containerName}`,
    );
    return stdout || stderr || "";
  } catch (err: any) {
    return `Failed to fetch logs: ${err.message}`;
  }
}

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

    console.log("🟢 [Monitor] Starting continuous monitor");
    console.log("🟢 [Monitor] Config:", this.config);

    this.state.isRunning = true;
    this.emit("started", { config: this.config });

    // Run first check immediately
    await this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(async () => {
      await this.runCheck();
    }, this.config.interval * 1000);

    console.log(
      `✅ [Monitor] Monitor started, checking every ${this.config.interval}s`,
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.state.isRunning = false;
    this.emit("stopped", { state: this.state });

    console.log("🔴 [Monitor] Monitor stopped");
  }

  getState(): MonitorState {
    return { ...this.state };
  }

  private async runCheck() {
    this.state.checkCount++;
    this.state.lastCheck = new Date().toISOString();

    console.log(`\n📊 [Monitor] Check #${this.state.checkCount}`);

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
      console.error("❌ [Monitor] Check failed:", err.message);
      this.addAlert("critical", "Monitor check failed", {
        error: err.message,
      });
    }
  }

  private async checkContainers() {
    console.log("🐳 [Monitor] Checking containers");

    const result = await runDockerListAll({
      filters: this.config.containerFilters,
      includeStats: true,
      checkApplicationHealth: true, // ✅ Enable app health checks
    });

    console.log(`📦 [Monitor] Found ${result.totalCount} containers`);
    console.log(`✅ [Monitor] Healthy: ${result.healthyCount}`);
    console.log(`❌ [Monitor] Unhealthy: ${result.unhealthyCount}`);

    // ✅ Build detailed metrics for each container
    const containerMetrics: ContainerMetric[] = [];

    for (const container of result.containers) {
      const containerName = container.name;

      console.log(`\n🔍 [Monitor] Processing: ${containerName}`);

      // Get ports and HTTP health
      const ports = await getContainerPorts(containerName);
      const httpHealth = await checkHTTPHealth(containerName, ports);

      // Fetch logs
      const logs = await fetchContainerLogs(containerName, 100);

      // Determine health status
      const dockerHealthy = container.status === "running";
      const applicationHealthy = httpHealth.healthy;

      // Build issues list
      const issues: string[] = [];
      if (!dockerHealthy) {
        issues.push(`Container not running (status: ${container.status})`);
      }
      if (!applicationHealthy && httpHealth.checked) {
        issues.push("Application health check failed");

        // Extract error patterns from logs
        const errorLines = logs
          .split("\n")
          .filter(
            (line) =>
              line.toLowerCase().includes("error") ||
              line.toLowerCase().includes("fail") ||
              line.toLowerCase().includes("exception"),
          )
          .slice(0, 3);

        if (errorLines.length > 0) {
          issues.push("Recent errors:");
          errorLines.forEach((line) => issues.push(`  ${line.trim()}`));
        }
      }

      const cpuPercent = container.cpuPercent || "0%";
      const memPercent = container.memPercent || "0%";

      if (parseFloat(cpuPercent) > 80) {
        issues.push(`High CPU usage: ${cpuPercent}`);
      }
      if (parseFloat(memPercent) > 80) {
        issues.push(`High memory usage: ${memPercent}`);
      }

      // Determine severity
      let severity: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
      if (!dockerHealthy || !applicationHealthy) {
        severity = "CRITICAL";
      } else if (parseFloat(cpuPercent) > 80 || parseFloat(memPercent) > 80) {
        severity = "WARNING";
      }

      const metric: ContainerMetric = {
        containerName,
        dockerHealthy,
        applicationHealthy,
        cpuPercent,
        memPercent,
        severity,
        timestamp: new Date().toISOString(),
        httpHealthStatus: httpHealth.checked ? httpHealth : undefined,
        issues: issues.length > 0 ? issues : undefined,
        logs,
      };

      containerMetrics.push(metric);
      this.state.containerMetrics!.set(containerName, metric);

      console.log(
        `📊 [Monitor] ${containerName}: ${severity} (Docker: ${dockerHealthy}, App: ${applicationHealthy})`,
      );
    }

    // Detect changes
    if (this.previousState && this.config.alertOnChange) {
      const prev = this.previousState as typeof result;

      // New unhealthy containers
      const newUnhealthy = (result.unhealthyContainers || []).filter(
        (name: string) => !(prev.unhealthyContainers || []).includes(name),
      );

      if (newUnhealthy.length > 0) {
        console.log("🚨 [Monitor] New unhealthy containers:", newUnhealthy);
        this.addAlert("critical", "Containers became unhealthy", {
          containers: newUnhealthy,
          totalUnhealthy: result.unhealthyCount,
        });
      }

      // Containers recovered
      const recovered = (prev.unhealthyContainers || []).filter(
        (name: string) => !(result.unhealthyContainers || []).includes(name),
      );

      if (recovered.length > 0) {
        console.log("✅ [Monitor] Containers recovered:", recovered);
        this.addAlert("info", "Containers recovered", {
          containers: recovered,
          totalHealthy: result.healthyCount,
        });
      }
    }

    this.previousState = result;

    // ✅ Emit check_completed with full container data
    this.emit("check_completed", {
      type: "containers",
      result: {
        ...result,
        containers: containerMetrics, // ✅ Send enriched metrics
      },
      alerts: this.state.alerts.slice(-5),
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

    console.log(`🚨 [Monitor] Alert (${severity}):`, message);
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
