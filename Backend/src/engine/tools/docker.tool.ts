import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ====================================
// 🐳 IMPROVED DOCKER TOOLS
// ====================================

export type DockerStatusConfig = {
  containerName: string;
  checkApplicationHealth?: boolean; // NEW: Check app-level health
  healthTimeout?: number;
};

export type DockerStatusResult = {
  success: boolean;
  containerName: string;
  status: string;
  running: boolean;
  health?: string; // Docker native health
  applicationHealthy?: boolean; // NEW: Application-level health
  uptime?: string;
  image?: string;
  ports?: string[];
  error?: string;
};

export type DockerListAllConfig = {
  filters?: string;
  includeStats?: boolean;
  checkApplicationHealth?: boolean; // NEW
};

export type DockerListAllResult = {
  success: boolean;
  totalCount: number;
  runningCount: number;
  healthyCount: number;
  unhealthyCount: number;
  unhealthyContainers: string[];
  applicationUnhealthyContainers: string[]; // NEW
  containers: Array<{
    name: string;
    status: string;
    health?: string;
    applicationHealthy?: boolean; // NEW
    image: string;
    ports?: string;
    cpuPercent?: string;
    memPercent?: string;
  }>;
  timestamp: string;
  error?: string;
};

// NEW: Quick application health check
async function checkApplicationHealth(
  containerName: string,
  timeout: number = 3000,
): Promise<boolean> {
  try {
    // Get container ports
    const { stdout: inspectOut } = await execAsync(
      `docker inspect ${containerName}`,
    );
    const containers = JSON.parse(inspectOut);

    if (!containers || containers.length === 0) {
      return false;
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

    if (ports.length === 0) {
      // No ports exposed, assume healthy if running
      return container.State?.Status === "running";
    }

    // Try to connect to the first port with a simple health check
    const axios = require("axios");
    const healthPaths = ["/health", "/healthz", "/"];

    for (const port of ports) {
      for (const path of healthPaths) {
        try {
          const response = await axios.get(`http://localhost:${port}${path}`, {
            timeout,
            validateStatus: () => true,
          });

          if (response.status >= 200 && response.status < 300) {
            // Check response content for health indicators
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
  } catch {
    return false;
  }
}

export async function runDockerStatus(
  config: DockerStatusConfig,
): Promise<DockerStatusResult> {
  try {
    const { stdout } = await execAsync(
      `docker inspect ${config.containerName}`,
    );
    const containers = JSON.parse(stdout);

    if (!containers || containers.length === 0) {
      return {
        success: false,
        containerName: config.containerName,
        status: "not_found",
        running: false,
        error: "Container not found",
      };
    }

    const container = containers[0];
    const state = container.State || {};
    const status = state.Status || "unknown";
    const running = status === "running";
    const health = state.Health?.Status;

    // NEW: Check application health if requested
    let applicationHealthy: boolean | undefined;
    if (config.checkApplicationHealth && running) {
      applicationHealthy = await checkApplicationHealth(
        config.containerName,
        config.healthTimeout,
      );
    }

    // Calculate uptime
    let uptime: string | undefined;
    if (running && state.StartedAt) {
      const startTime = new Date(state.StartedAt);
      const now = new Date();
      const uptimeMs = now.getTime() - startTime.getTime();
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      uptime = `${hours}h ${minutes}m`;
    }

    // Get ports
    const ports: string[] = [];
    if (container.NetworkSettings?.Ports) {
      Object.entries(container.NetworkSettings.Ports).forEach(
        ([containerPort, hostBindings]: [string, any]) => {
          if (hostBindings && Array.isArray(hostBindings)) {
            hostBindings.forEach((binding: any) => {
              if (binding.HostPort) {
                ports.push(`${binding.HostPort}->${containerPort}`);
              }
            });
          }
        },
      );
    }

    return {
      success: true,
      containerName: config.containerName,
      status,
      running,
      health,
      applicationHealthy,
      uptime,
      image: container.Config?.Image,
      ports: ports.length > 0 ? ports : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      containerName: config.containerName,
      status: "error",
      running: false,
      error: err.message,
    };
  }
}

export async function runDockerListAll(
  config: DockerListAllConfig,
): Promise<DockerListAllResult> {
  try {
    let cmd = "docker ps -a --format json";
    if (config.filters) {
      cmd += ` --filter "${config.filters}"`;
    }

    const { stdout } = await execAsync(cmd);
    const lines = stdout.trim().split("\n").filter(Boolean);

    const containers = [];
    const unhealthyContainers: string[] = [];
    const applicationUnhealthyContainers: string[] = [];

    for (const line of lines) {
      const containerData = JSON.parse(line);
      const name = containerData.Names;
      const status = containerData.State;
      const running = status === "running";

      let health: string | undefined;
      let applicationHealthy: boolean | undefined;
      let cpuPercent: string | undefined;
      let memPercent: string | undefined;

      // Get detailed info
      try {
        const { stdout: inspectOut } = await execAsync(
          `docker inspect ${name}`,
        );
        const details = JSON.parse(inspectOut);

        if (details && details.length > 0) {
          health = details[0].State?.Health?.Status;

          // NEW: Check application health if requested
          if (config.checkApplicationHealth && running) {
            applicationHealthy = await checkApplicationHealth(name);
          }

          // Get stats if requested
          if (config.includeStats && running) {
            try {
              const { stdout: statsOut } = await execAsync(
                `docker stats ${name} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`,
              );
              const [cpu, mem] = statsOut.trim().split(",");
              cpuPercent = cpu;
              memPercent = mem;
            } catch {
              // Stats collection failed, continue
            }
          }
        }
      } catch {
        // Inspection failed, continue with basic data
      }

      // Determine if unhealthy
      const isUnhealthy =
        !running ||
        (health && health !== "healthy") ||
        applicationHealthy === false;

      const isAppUnhealthy = running && applicationHealthy === false;

      if (isUnhealthy) {
        unhealthyContainers.push(name);
      }

      if (isAppUnhealthy) {
        applicationUnhealthyContainers.push(name);
      }

      containers.push({
        name,
        status,
        health,
        applicationHealthy,
        image: containerData.Image,
        ports: containerData.Ports,
        cpuPercent,
        memPercent,
      });
    }

    const runningCount = containers.filter(
      (c) => c.status === "running",
    ).length;
    const healthyCount = containers.filter((c) => {
      const containerHealthy = c.status === "running";
      const dockerHealthy = !c.health || c.health === "healthy";
      const appHealthy = c.applicationHealthy !== false;
      return containerHealthy && dockerHealthy && appHealthy;
    }).length;

    return {
      success: true,
      totalCount: containers.length,
      runningCount,
      healthyCount,
      unhealthyCount: unhealthyContainers.length,
      unhealthyContainers,
      applicationUnhealthyContainers,
      containers,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      totalCount: 0,
      runningCount: 0,
      healthyCount: 0,
      unhealthyCount: 0,
      unhealthyContainers: [],
      applicationUnhealthyContainers: [],
      containers: [],
      timestamp: new Date().toISOString(),
      error: err.message,
    };
  }
}

export async function runDockerLogs(config: {
  containerName: string;
  tail?: number;
  timestamps?: boolean;
}) {
  try {
    const tail = config.tail || 100;
    const timestamps = config.timestamps ? "--timestamps" : "";

    const cmd = `docker logs ${timestamps} --tail ${tail} ${config.containerName}`;
    const { stdout, stderr } = await execAsync(cmd);

    const logs = stdout || stderr || "";

    return {
      success: true,
      containerName: config.containerName,
      logs,
      lineCount: logs.split("\n").length,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      containerName: config.containerName,
      logs: "",
      lineCount: 0,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function runDockerRestart(config: {
  containerName: string;
  timeout?: number;
}) {
  try {
    const timeout = config.timeout || 10;
    const cmd = `docker restart -t ${timeout} ${config.containerName}`;

    await execAsync(cmd);

    return {
      success: true,
      action: "restart",
      containerName: config.containerName,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      action: "restart",
      containerName: config.containerName,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function runDockerRollback(config: {
  containerName: string;
  rollbackImage: string;
  preserveVolumes?: boolean;
  preserveNetwork?: boolean;
}) {
  try {
    // Get current container info
    const { stdout: inspectOut } = await execAsync(
      `docker inspect ${config.containerName}`,
    );
    const details = JSON.parse(inspectOut);

    if (!details || details.length === 0) {
      throw new Error("Container not found");
    }

    const previousImage = details[0].Config?.Image;

    // Stop and remove current container
    await execAsync(`docker stop ${config.containerName}`);
    await execAsync(`docker rm ${config.containerName}`);

    // Start new container with rollback image
    let cmd = `docker run -d --name ${config.containerName}`;

    if (config.preserveVolumes !== false) {
      // Preserve volumes
      const mounts = details[0].Mounts || [];
      for (const mount of mounts) {
        cmd += ` -v ${mount.Source}:${mount.Destination}`;
      }
    }

    if (config.preserveNetwork !== false) {
      // Preserve network
      const network = details[0].HostConfig?.NetworkMode;
      if (network) {
        cmd += ` --network ${network}`;
      }
    }

    cmd += ` ${config.rollbackImage}`;

    await execAsync(cmd);

    return {
      success: true,
      action: "rollback",
      containerName: config.containerName,
      previousImage,
      currentImage: config.rollbackImage,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      action: "rollback",
      containerName: config.containerName,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function runDockerBulkRestart(config: {
  containerNames: string | string[];
  timeout?: number;
  continueOnError?: boolean;
}) {
  const containerNames = Array.isArray(config.containerNames)
    ? config.containerNames
    : config.containerNames.split(",").map((s) => s.trim());

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const name of containerNames) {
    try {
      const result = await runDockerRestart({
        containerName: name,
        timeout: config.timeout,
      });

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      if (!result.success && !config.continueOnError) {
        break;
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        success: false,
        containerName: name,
        error: err.message,
      });

      if (!config.continueOnError) {
        break;
      }
    }
  }

  return {
    success: failedCount === 0,
    totalCount: containerNames.length,
    successCount,
    failedCount,
    results,
    timestamp: new Date().toISOString(),
  };
}

export async function runDockerBulkLogs(config: {
  containerNames: string | string[];
  tail?: number;
}) {
  const containerNames = Array.isArray(config.containerNames)
    ? config.containerNames
    : config.containerNames.split(",").map((s) => s.trim());

  const logs: Record<string, string> = {};
  const failedContainers: string[] = [];

  for (const name of containerNames) {
    try {
      const result = await runDockerLogs({
        containerName: name,
        tail: config.tail,
      });

      if (result.success) {
        logs[name] = result.logs;
      } else {
        failedContainers.push(name);
      }
    } catch {
      failedContainers.push(name);
    }
  }

  return {
    success: failedContainers.length === 0,
    logs,
    failedContainers,
    timestamp: new Date().toISOString(),
  };
}
