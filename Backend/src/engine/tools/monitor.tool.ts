import { EventEmitter } from "events";
import { exec } from "child_process";
import { promisify } from "util";
import { buildDockerCommand } from "../../config/docker.config";

const execAsync = promisify(exec);

// Helper: Execute Docker command with proper host configuration
async function execDockerCommand(command: string, timeout?: number) {
  const fullCommand = buildDockerCommand(command);
  console.log(`🐳 [Monitor Tool] Executing: ${fullCommand}`);

  return await execAsync(fullCommand, {
    timeout: timeout || 30000,
  });
}

// ====================================
// 📡 ENHANCED MONITOR WITH CONTAINER SELECTION
// ====================================

export type MonitorConfig = {
  targets: "containers" | "apis" | "resources";
  interval: number;
  alertOnChange: boolean;
  autoFix?: boolean;
  containerFilters?: string;
  selectedContainers?: string[];
  apiEndpoints?: Array<{ url: string; expectedStatus: number }>;
  runId?: string;
};

export type ContainerMetric = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  cpuPercent: string;
  memPercent: string;
  memUsage: string;
  memLimit: string;
  networkIn: string;
  networkOut: string;
  diskRead: string;
  diskWrite: string;
  restartCount: number;
  uptime: string;
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
  selectedContainers?: string[];
};

// ====================================
// 🔍 DOCKER INSPECTION HELPERS
// ====================================

/**
 * Get all available containers
 */
export async function getAllContainers(): Promise<
  Array<{
    name: string;
    status: string;
    id: string;
    image: string;
  }>
> {
  try {
    const { stdout } = await execDockerCommand(
      'ps -a --format "{{.Names}}|{{.Status}}|{{.ID}}|{{.Image}}"',
    );

    return stdout
      .trim()
      .split("\n")
      .filter((line) => line)
      .map((line) => {
        const [name, status, id, image] = line.split("|");
        return { name, status, id, image };
      });
  } catch (err: any) {
    console.error("❌ [Monitor] Failed to list containers:", err.message);
    return [];
  }
}

/**
 * Get container ports
 */
async function getContainerPorts(containerName: string): Promise<number[]> {
  try {
    const { stdout } = await execDockerCommand(`inspect ${containerName}`);
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
 * Get detailed container stats
 */
async function getContainerStats(containerName: string): Promise<{
  cpuPercent: string;
  memPercent: string;
  memUsage: string;
  memLimit: string;
  networkIn: string;
  networkOut: string;
  diskRead: string;
  diskWrite: string;
}> {
  try {
    const { stdout } = await execDockerCommand(
      `stats ${containerName} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}|{{.NetIO}}|{{.BlockIO}}"`,
    );

    const [cpuPercent, memPercent, memUsage, netIO, blockIO] = stdout
      .trim()
      .split("|");
    const [memUsed, memLimit] = memUsage.split(" / ");
    const [networkIn, networkOut] = netIO.split(" / ");
    const [diskRead, diskWrite] = blockIO.split(" / ");

    return {
      cpuPercent: cpuPercent.trim(),
      memPercent: memPercent.trim(),
      memUsage: memUsed.trim(),
      memLimit: memLimit.trim(),
      networkIn: networkIn.trim(),
      networkOut: networkOut.trim(),
      diskRead: diskRead.trim(),
      diskWrite: diskWrite.trim(),
    };
  } catch (err) {
    return {
      cpuPercent: "0%",
      memPercent: "0%",
      memUsage: "0B",
      memLimit: "0B",
      networkIn: "0B",
      networkOut: "0B",
      diskRead: "0B",
      diskWrite: "0B",
    };
  }
}

/**
 * Get container restart count and uptime
 */
async function getContainerInfo(containerName: string): Promise<{
  restartCount: number;
  uptime: string;
  status: string;
}> {
  try {
    const { stdout } = await execDockerCommand(
      `inspect ${containerName} --format '{{.RestartCount}}|{{.State.Status}}|{{.State.StartedAt}}'`,
    );

    const [restartCount, status, startedAt] = stdout.trim().split("|");

    // Calculate uptime
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const uptimeMs = now - startTime;

    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    let uptime = "";
    if (days > 0) uptime += `${days}d `;
    if (hours > 0) uptime += `${hours}h `;
    uptime += `${minutes}m`;

    return {
      restartCount: parseInt(restartCount) || 0,
      uptime: uptime.trim(),
      status,
    };
  } catch (err) {
    return {
      restartCount: 0,
      uptime: "0m",
      status: "unknown",
    };
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
    return { checked: false, healthy: true };
  }

  const axios = require("axios");
  const healthPaths = ["/health", "/healthz", "/api/health", "/"];

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
  tail: number = 200,
): Promise<string> {
  try {
    const { stdout, stderr } = await execDockerCommand(
      `logs --tail ${tail} ${containerName}`,
    );
    return stdout || stderr || "";
  } catch (err: any) {
    return `Failed to fetch logs: ${err.message}`;
  }
}

// ====================================
// 📊 ENHANCED CONTINUOUS MONITOR
// ====================================

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
      selectedContainers: config.selectedContainers || [],
    };
  }

  async start() {
    if (this.state.isRunning) {
      throw new Error("Monitor already running");
    }

    console.log("🟢 [Monitor] Starting enhanced monitor");
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

  updateSelectedContainers(containers: string[]) {
    this.state.selectedContainers = containers;
    this.config.selectedContainers = containers;
    console.log("🔄 [Monitor] Updated selected containers:", containers);
  }

  private async runCheck() {
    this.state.checkCount++;
    this.state.lastCheck = new Date().toISOString();

    console.log(`\n📊 [Monitor] Check #${this.state.checkCount}`);

    try {
      await this.checkContainers();
    } catch (err: any) {
      console.error("❌ [Monitor] Check failed:", err.message);
      this.addAlert("critical", "Monitor check failed", {
        error: err.message,
      });
    }
  }

  private async checkContainers() {
    console.log("🐳 [Monitor] Checking containers");

    // Get list of containers to monitor
    const allContainers = await getAllContainers();
    const selectedContainers = this.config.selectedContainers;

    let containersToCheck = allContainers;
    if (selectedContainers && selectedContainers.length > 0) {
      containersToCheck = allContainers.filter((c) =>
        selectedContainers.includes(c.name),
      );
    }

    console.log(`📦 [Monitor] Checking ${containersToCheck.length} containers`);

    const containerMetrics: ContainerMetric[] = [];

    for (const container of containersToCheck) {
      const containerName = container.name;

      console.log(`\n🔍 [Monitor] Processing: ${containerName}`);

      // Get comprehensive container data
      const [ports, stats, info, httpHealth, logs] = await Promise.all([
        getContainerPorts(containerName),
        getContainerStats(containerName),
        getContainerInfo(containerName),
        getContainerPorts(containerName).then((ports) =>
          checkHTTPHealth(containerName, ports),
        ),
        fetchContainerLogs(containerName, 200),
      ]);

      // Determine health status
      const dockerHealthy = info.status === "running";
      const applicationHealthy = httpHealth.healthy;

      // Build issues list
      const issues: string[] = [];
      if (!dockerHealthy) {
        issues.push(`Container not running (status: ${info.status})`);
      }
      if (!applicationHealthy && httpHealth.checked) {
        issues.push("Application health check failed");
      }

      // Check resource usage
      const cpuValue = parseFloat(stats.cpuPercent);
      const memValue = parseFloat(stats.memPercent);

      if (cpuValue > 80) {
        issues.push(`High CPU usage: ${stats.cpuPercent}`);
      }
      if (memValue > 80) {
        issues.push(`High memory usage: ${stats.memPercent}`);
      }
      if (info.restartCount > 5) {
        issues.push(`Container has restarted ${info.restartCount} times`);
      }

      // Extract error patterns from logs
      if (!dockerHealthy || !applicationHealthy) {
        const errorLines = logs
          .split("\n")
          .filter(
            (line) =>
              line.toLowerCase().includes("error") ||
              line.toLowerCase().includes("fail") ||
              line.toLowerCase().includes("exception") ||
              line.toLowerCase().includes("fatal"),
          )
          .slice(0, 3);

        if (errorLines.length > 0) {
          issues.push("Recent errors found in logs");
        }
      }

      // Determine severity
      let severity: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
      if (!dockerHealthy || !applicationHealthy) {
        severity = "CRITICAL";
      } else if (cpuValue > 80 || memValue > 80 || info.restartCount > 5) {
        severity = "WARNING";
      }

      const metric: ContainerMetric = {
        containerName,
        dockerHealthy,
        applicationHealthy,
        ...stats,
        restartCount: info.restartCount,
        uptime: info.uptime,
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
      const prevMetrics = this.previousState as ContainerMetric[];

      // Find newly unhealthy containers
      const newUnhealthy = containerMetrics
        .filter((m) => m.severity === "CRITICAL")
        .filter(
          (m) =>
            !prevMetrics.some(
              (p) =>
                p.containerName === m.containerName &&
                p.severity === "CRITICAL",
            ),
        );

      if (newUnhealthy.length > 0) {
        console.log(
          "🚨 [Monitor] New unhealthy containers:",
          newUnhealthy.map((m) => m.containerName),
        );
        this.addAlert("critical", "Containers became unhealthy", {
          containers: newUnhealthy.map((m) => m.containerName),
        });
      }

      // Find recovered containers
      const recovered = containerMetrics
        .filter((m) => m.severity === "HEALTHY")
        .filter((m) =>
          prevMetrics.some(
            (p) =>
              p.containerName === m.containerName && p.severity !== "HEALTHY",
          ),
        );

      if (recovered.length > 0) {
        console.log(
          "✅ [Monitor] Containers recovered:",
          recovered.map((m) => m.containerName),
        );
        this.addAlert("info", "Containers recovered", {
          containers: recovered.map((m) => m.containerName),
        });
      }
    }

    this.previousState = containerMetrics;

    // Emit check_completed with full container data
    this.emit("check_completed", {
      type: "containers",
      result: {
        containers: containerMetrics,
        totalCount: containerMetrics.length,
        healthyCount: containerMetrics.filter((m) => m.severity === "HEALTHY")
          .length,
        warningCount: containerMetrics.filter((m) => m.severity === "WARNING")
          .length,
        criticalCount: containerMetrics.filter((m) => m.severity === "CRITICAL")
          .length,
      },
      alerts: this.state.alerts.slice(-10),
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