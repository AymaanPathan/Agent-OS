import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

// ====================================
// 🏥 HEALTH CHECK SCANNER (FIXED)
// ====================================

export type HealthCheckScannerConfig = {
  containerNames?: string[];
  scanAllRunning?: boolean;
  timeout?: number;
};

export type ContainerHealthReport = {
  containerName: string;
  dockerHealthy: boolean;
  applicationHealthy: boolean;
  httpHealthStatus?: {
    checked: boolean;
    healthy: boolean;
    statusCode?: number;
    responseTime?: number;
    checkedUrl?: string;
    error?: string;
  };
  ports: number[];
  status: string;
  logs?: string;
};

export type HealthCheckScannerResult = {
  success: boolean;
  scannedCount: number;
  healthyCount: number;
  unhealthyCount: number;
  unhealthyContainers: string[];
  reports: ContainerHealthReport[];
  timestamp: string;
  error?: string;
};

/**
 * Get exposed ports for a container
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

    console.log(`📊 [HealthScanner] Ports for ${containerName}:`, ports);
    return ports;
  } catch (err) {
    console.error(
      `❌ [HealthScanner] Failed to get ports for ${containerName}:`,
      err,
    );
    return [];
  }
}

/**
 * Check if container is running via Docker
 */
async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{.State.Running}}' ${containerName}`,
    );
    const isRunning = stdout.trim() === "true";
    console.log(`🐳 [HealthScanner] ${containerName} running:`, isRunning);
    return isRunning;
  } catch (err) {
    console.error(
      `❌ [HealthScanner] Failed to check if ${containerName} is running:`,
      err,
    );
    return false;
  }
}

/**
 * Get container status
 */
async function getContainerStatus(containerName: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{.State.Status}}' ${containerName}`,
    );
    return stdout.trim();
  } catch (err) {
    return "unknown";
  }
}

/**
 * Fetch container logs
 */
async function getContainerLogs(
  containerName: string,
  tail: number = 100,
): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(
      `docker logs --tail ${tail} ${containerName}`,
    );
    const logs = stdout || stderr || "";
    console.log(
      `📋 [HealthScanner] Fetched ${logs.split("\n").length} lines of logs for ${containerName}`,
    );
    return logs;
  } catch (err: any) {
    console.error(
      `❌ [HealthScanner] Failed to fetch logs for ${containerName}:`,
      err.message,
    );
    return `Failed to fetch logs: ${err.message}`;
  }
}

/**
 * Perform HTTP health check on a container
 * FIXED: Better error handling and health determination
 */
async function checkContainerHTTPHealth(
  containerName: string,
  ports: number[],
  timeout: number = 3000,
): Promise<{
  checked: boolean;
  healthy: boolean;
  statusCode?: number;
  responseTime?: number;
  checkedUrl?: string;
  error?: string;
}> {
  if (ports.length === 0) {
    console.log(
      `⚠️ [HealthScanner] ${containerName} has no exposed ports, skipping HTTP check`,
    );
    return {
      checked: false,
      healthy: true, // ✅ FIX: No ports = healthy (not an error)
    };
  }

  const healthPaths = ["/health", "/healthz", "/"];

  // Try each port
  for (const port of ports) {
    for (const path of healthPaths) {
      const url = `http://localhost:${port}${path}`;
      const startTime = Date.now();

      try {
        console.log(`🔍 [HealthScanner] Checking ${url}`);

        const response = await axios.get(url, {
          timeout,
          validateStatus: () => true, // Don't throw on any status
        });

        const responseTime = Date.now() - startTime;

        console.log(
          `📊 [HealthScanner] ${url} responded with status ${response.status} in ${responseTime}ms`,
        );

        // ✅ FIX: Check for explicit unhealthy status in response body
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
              console.log(
                `⚠️ [HealthScanner] ${url} returned unhealthy status in body:`,
                response.data,
              );
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
      } catch (err: any) {
        console.log(
          `⚠️ [HealthScanner] ${url} failed:`,
          err.code || err.message,
        );
        // Continue to next path/port
        continue;
      }
    }
  }

  // ✅ FIX: If we couldn't connect to any endpoint, mark as unhealthy
  console.log(
    `❌ [HealthScanner] ${containerName} - all health check attempts failed`,
  );
  return {
    checked: true,
    healthy: false,
    error: "All health check endpoints failed to respond",
  };
}

/**
 * Main health check scanner function
 */
export async function runHealthCheckScanner(
  config: HealthCheckScannerConfig,
): Promise<HealthCheckScannerResult> {
  console.log("🏥 [HealthScanner] Starting health check scan");
  console.log("🏥 [HealthScanner] Config:", JSON.stringify(config, null, 2));

  try {
    let containerNames: string[] = [];

    // Determine which containers to scan
    if (config.scanAllRunning) {
      console.log("🔍 [HealthScanner] Scanning all running containers");

      const { stdout } = await execAsync(
        `docker ps --format "{{.Names}}" --filter "status=running"`,
      );

      containerNames = stdout
        .trim()
        .split("\n")
        .filter((name) => name.length > 0);

      console.log(
        `📦 [HealthScanner] Found ${containerNames.length} running containers`,
      );
    } else if (config.containerNames && config.containerNames.length > 0) {
      // ✅ FIX: Better validation and filtering
      containerNames = config.containerNames
        .filter((name) => {
          const isValid =
            name != null && typeof name === "string" && name.trim().length > 0;
          if (!isValid) {
            console.warn(
              `⚠️ [HealthScanner] Filtered invalid container name:`,
              name,
            );
          }
          return isValid;
        })
        .map((name) => name.trim());

      console.log(
        `📦 [HealthScanner] Scanning ${containerNames.length} specific containers:`,
        containerNames,
      );
    } else {
      console.log("⚠️ [HealthScanner] No containers to scan");
      return {
        success: true,
        scannedCount: 0,
        healthyCount: 0,
        unhealthyCount: 0,
        unhealthyContainers: [],
        reports: [],
        timestamp: new Date().toISOString(),
      };
    }

    const reports: ContainerHealthReport[] = [];
    const unhealthyContainers: string[] = [];
    let healthyCount = 0;

    // Scan each container
    for (const containerName of containerNames) {
      console.log(`\n🔍 [HealthScanner] Scanning: ${containerName}`);

      try {
        // Get container status
        const status = await getContainerStatus(containerName);
        const dockerHealthy = await isContainerRunning(containerName);

        console.log(
          `🐳 [HealthScanner] ${containerName} - Status: ${status}, Running: ${dockerHealthy}`,
        );

        // Get ports
        const ports = await getContainerPorts(containerName);

        // Fetch logs
        const logs = await getContainerLogs(containerName, 100);

        let applicationHealthy = true;
        let httpHealthStatus = undefined;

        // Only check HTTP health if container is running
        if (dockerHealthy) {
          httpHealthStatus = await checkContainerHTTPHealth(
            containerName,
            ports,
            config.timeout || 3000,
          );

          applicationHealthy = httpHealthStatus.healthy;

          console.log(
            `🏥 [HealthScanner] ${containerName} - HTTP Health: ${applicationHealthy}`,
          );
        } else {
          console.log(
            `⚠️ [HealthScanner] ${containerName} is not running, skipping HTTP check`,
          );
          applicationHealthy = false;
        }

        const report: ContainerHealthReport = {
          containerName,
          dockerHealthy,
          applicationHealthy,
          httpHealthStatus,
          ports,
          status,
          logs,
        };

        reports.push(report);

        // ✅ FIX: Container is unhealthy if EITHER docker is down OR app is unhealthy
        if (!dockerHealthy || !applicationHealthy) {
          unhealthyContainers.push(containerName);
          console.log(`❌ [HealthScanner] ${containerName} is UNHEALTHY`);
        } else {
          healthyCount++;
          console.log(`✅ [HealthScanner] ${containerName} is HEALTHY`);
        }
      } catch (err: any) {
        console.error(
          `❌ [HealthScanner] Error scanning ${containerName}:`,
          err.message,
        );

        // Add error report
        reports.push({
          containerName,
          dockerHealthy: false,
          applicationHealthy: false,
          ports: [],
          status: "error",
          logs: `Error: ${err.message}`,
        });

        unhealthyContainers.push(containerName);
      }
    }

    const result: HealthCheckScannerResult = {
      success: true,
      scannedCount: containerNames.length,
      healthyCount,
      unhealthyCount: unhealthyContainers.length,
      unhealthyContainers,
      reports,
      timestamp: new Date().toISOString(),
    };

    console.log("\n✅ [HealthScanner] Scan complete");
    console.log(
      `📊 [HealthScanner] Results: ${healthyCount} healthy, ${unhealthyContainers.length} unhealthy`,
    );
    console.log(
      `📋 [HealthScanner] Unhealthy containers:`,
      unhealthyContainers,
    );

    return result;
  } catch (err: any) {
    console.error("❌ [HealthScanner] Fatal error:", err.message);

    return {
      success: false,
      scannedCount: 0,
      healthyCount: 0,
      unhealthyCount: 0,
      unhealthyContainers: [],
      reports: [],
      timestamp: new Date().toISOString(),
      error: err.message,
    };
  }
}
