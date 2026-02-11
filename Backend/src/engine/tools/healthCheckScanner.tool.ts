import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ====================================
// 🏥 HEALTH CHECK SCANNER
// ====================================

export type HealthCheckScannerConfig = {
  containerNames?: string[];
  scanAllRunning?: boolean;
  timeout?: number;
};

export type ContainerHealthReport = {
  containerName: string;
  containerRunning: boolean;
  containerStatus: string;
  containerHealth?: string;
  httpHealthStatus?: {
    checked: boolean;
    healthy: boolean;
    statusCode?: number;
    responseTime?: number;
    checkedUrl?: string;
    healthDetails?: any;
    error?: string;
  };
  applicationHealthy: boolean;
  overallHealthy: boolean;
  issues: string[];
};

export type HealthCheckScannerResult = {
  success: boolean;
  scannedCount: number;
  healthyCount: number;
  unhealthyCount: number;
  unhealthyContainers: string[];
  applicationUnhealthyContainers: string[];
  reports: ContainerHealthReport[];
  timestamp: string;
  error?: string;
};

/**
 * Check if application reports itself as unhealthy based on response body
 */
function isApplicationUnhealthy(responseData: any): boolean {
  if (!responseData || typeof responseData !== "object") {
    return false;
  }

  // Check various common health status fields
  const statusField =
    responseData.status || responseData.health || responseData.state;

  if (statusField) {
    const statusStr = String(statusField).toLowerCase();

    // 🔥 CRITICAL: Detect unhealthy indicators
    const unhealthyIndicators = [
      "unhealthy",
      "down",
      "error",
      "failed",
      "failing",
      "degraded",
      "critical",
      "unavailable",
    ];

    for (const indicator of unhealthyIndicators) {
      if (statusStr.includes(indicator)) {
        console.log(
          `🚨 [HealthCheck] Detected unhealthy indicator: ${indicator} in status: ${statusStr}`,
        );
        return true;
      }
    }
  }

  // Check for error field
  if (responseData.error || responseData.errors) {
    console.log(`🚨 [HealthCheck] Found error field in response`);
    return true;
  }

  // Check for failed checks
  if (responseData.checks && Array.isArray(responseData.checks)) {
    const failedChecks = responseData.checks.filter((check: any) => {
      const checkStatus = String(check.status || "").toLowerCase();
      return (
        checkStatus === "failed" ||
        checkStatus === "unhealthy" ||
        checkStatus === "down"
      );
    });

    if (failedChecks.length > 0) {
      console.log(
        `🚨 [HealthCheck] Found ${failedChecks.length} failed health checks`,
      );
      return true;
    }
  }

  return false;
}

/**
 * Perform HTTP health check on a container
 */
async function checkContainerHttpHealth(
  containerName: string,
  timeout: number = 3000,
): Promise<{
  checked: boolean;
  healthy: boolean;
  statusCode?: number;
  responseTime?: number;
  checkedUrl?: string;
  healthDetails?: any;
  error?: string;
}> {
  try {
    // Get container inspection data
    const { stdout: inspectOut } = await execAsync(
      `docker inspect ${containerName}`,
    );
    const containers = JSON.parse(inspectOut);

    if (!containers || containers.length === 0) {
      console.log(`❌ [HealthCheck] Container ${containerName} not found`);
      return { checked: false, healthy: false, error: "Container not found" };
    }

    const container = containers[0];

    // Check if container is running
    if (container.State?.Status !== "running") {
      console.log(
        `❌ [HealthCheck] Container ${containerName} not running (status: ${container.State?.Status})`,
      );
      return { checked: false, healthy: false, error: "Container not running" };
    }

    // Extract exposed ports - MORE COMPREHENSIVE
    const ports: number[] = [];

    // Method 1: Check NetworkSettings.Ports
    if (container.NetworkSettings?.Ports) {
      console.log(
        `🔍 [HealthCheck] ${containerName} - Ports config:`,
        container.NetworkSettings.Ports,
      );

      Object.entries(container.NetworkSettings.Ports).forEach(
        ([containerPort, hostBindings]: [string, any]) => {
          console.log(
            `  📌 Container port: ${containerPort}, bindings:`,
            hostBindings,
          );

          if (hostBindings && Array.isArray(hostBindings)) {
            hostBindings.forEach((binding: any) => {
              if (binding.HostPort) {
                const port = parseInt(binding.HostPort);
                ports.push(port);
                console.log(`  ✅ Found host port: ${port}`);
              }
            });
          }
        },
      );
    }

    // Method 2: Check Config.ExposedPorts as fallback
    if (ports.length === 0 && container.Config?.ExposedPorts) {
      console.log(
        `🔍 [HealthCheck] ${containerName} - Checking ExposedPorts:`,
        container.Config.ExposedPorts,
      );

      Object.keys(container.Config.ExposedPorts).forEach((portSpec) => {
        const portMatch = portSpec.match(/^(\d+)/);
        if (portMatch) {
          const port = parseInt(portMatch[1]);
          ports.push(port);
          console.log(`  ✅ Found exposed port: ${port}`);
        }
      });
    }

    if (ports.length === 0) {
      console.log(`⚠️ [HealthCheck] No ports found for ${containerName}`);
      console.log(
        `   NetworkSettings.Ports:`,
        container.NetworkSettings?.Ports,
      );
      console.log(`   Config.ExposedPorts:`, container.Config?.ExposedPorts);
      return {
        checked: false,
        healthy: false,
        error: "No exposed ports found",
      };
    }

    console.log(`🔍 [HealthCheck] ${containerName} - Will check ports:`, ports);

    // Try common health check paths
    const healthPaths = ["/health", "/healthz", "/api/health", "/"];
    let lastError = "";

    for (const port of ports) {
      for (const path of healthPaths) {
        const url = `http://localhost:${port}${path}`;

        try {
          console.log(`🌐 [HealthCheck] Attempting: ${url}`);

          const startTime = Date.now();
          const response = await axios.get(url, {
            timeout,
            validateStatus: () => true, // Don't throw on any status
            headers: {
              "User-Agent": "HealthCheckScanner/1.0",
            },
          });
          const responseTime = Date.now() - startTime;

          console.log(
            `📊 [HealthCheck] ${containerName} - ${url} - Status: ${response.status}`,
          );
          console.log(`📊 [HealthCheck] Response type:`, typeof response.data);
          console.log(
            `📊 [HealthCheck] Response data:`,
            JSON.stringify(response.data),
          );

          // Check if HTTP status is successful
          const httpHealthy = response.status >= 200 && response.status < 300;

          // 🔥 CRITICAL: Check application-level health from response body
          const applicationUnhealthy = isApplicationUnhealthy(response.data);

          console.log(
            `📊 [HealthCheck] ${containerName} - HTTP healthy: ${httpHealthy}, App unhealthy: ${applicationUnhealthy}`,
          );

          return {
            checked: true,
            healthy: httpHealthy && !applicationUnhealthy, // Both HTTP and app must be healthy
            statusCode: response.status,
            responseTime,
            checkedUrl: url,
            healthDetails: response.data,
          };
        } catch (err) {
          lastError = (err as Error).message;
          console.log(`⚠️ [HealthCheck] Failed to check ${url}:`, lastError);
          continue; // Try next path
        }
      }
    }

    // No successful health check
    console.log(
      `❌ [HealthCheck] All health checks failed for ${containerName}`,
    );
    return {
      checked: false,
      healthy: false,
      error: lastError || "All health check attempts failed",
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(
      `❌ [HealthCheck] Error checking ${containerName}:`,
      errorMsg,
    );
    return {
      checked: false,
      healthy: false,
      error: errorMsg,
    };
  }
}

/**
 * Main scanner function
 */
export async function runHealthCheckScanner(
  config: HealthCheckScannerConfig,
): Promise<HealthCheckScannerResult> {
  console.log("🏥 [HealthCheckScanner] Starting scan");
  console.log(
    "🏥 [HealthCheckScanner] Config:",
    JSON.stringify(config, null, 2),
  );

  try {
    let containerNames: string[] = [];

    // Determine which containers to scan
    if (config.scanAllRunning) {
      console.log("🔍 [HealthCheckScanner] Scanning all running containers");
      const { stdout } = await execAsync("docker ps --format {{.Names}}");
      containerNames = stdout.trim().split("\n").filter(Boolean);
      console.log(
        `📦 [HealthCheckScanner] Found ${containerNames.length} running containers`,
      );
    } else if (config.containerNames && config.containerNames.length > 0) {
      containerNames = config.containerNames
        .filter((name) => name && name.trim().length > 0)
        .map((name) => name.trim());
      console.log(
        `📦 [HealthCheckScanner] Scanning ${containerNames.length} specified containers`,
      );
    } else {
      console.log("⚠️ [HealthCheckScanner] No containers to scan");
      return {
        success: true,
        scannedCount: 0,
        healthyCount: 0,
        unhealthyCount: 0,
        unhealthyContainers: [],
        applicationUnhealthyContainers: [],
        reports: [],
        timestamp: new Date().toISOString(),
      };
    }

    const reports: ContainerHealthReport[] = [];
    const unhealthyContainers: string[] = [];
    const applicationUnhealthyContainers: string[] = [];

    // Scan each container
    for (const containerName of containerNames) {
      console.log(`\n🔍 [HealthCheckScanner] Checking: ${containerName}`);

      try {
        // Get container status
        const { stdout: inspectOut } = await execAsync(
          `docker inspect ${containerName}`,
        );
        const containers = JSON.parse(inspectOut);

        if (!containers || containers.length === 0) {
          reports.push({
            containerName,
            containerRunning: false,
            containerStatus: "not_found",
            applicationHealthy: false,
            overallHealthy: false,
            issues: ["Container not found"],
          });
          unhealthyContainers.push(containerName);
          continue;
        }

        const container = containers[0];
        const state = container.State || {};
        const status = state.Status || "unknown";
        const running = status === "running";
        const dockerHealth = state.Health?.Status;

        // Perform HTTP health check
        const httpHealth = await checkContainerHttpHealth(
          containerName,
          config.timeout || 3000,
        );

        console.log(
          `📊 [HealthCheckScanner] ${containerName} HTTP check result:`,
          httpHealth,
        );

        // Determine issues
        const issues: string[] = [];
        if (!running) {
          issues.push(`Container not running (status: ${status})`);
        }
        if (dockerHealth && dockerHealth !== "healthy") {
          issues.push(`Docker health check: ${dockerHealth}`);
        }

        // 🔥 CRITICAL: If HTTP check was attempted but failed or showed unhealthy
        if (httpHealth.checked && !httpHealth.healthy) {
          issues.push("Application health check failed");
        } else if (!httpHealth.checked && httpHealth.error) {
          // HTTP check couldn't be performed
          issues.push(`Health check error: ${httpHealth.error}`);
        }

        // 🔥 CRITICAL: Application is unhealthy if:
        // 1. HTTP check was performed and showed unhealthy, OR
        // 2. HTTP check couldn't be performed due to errors (connection refused, etc.)
        const applicationHealthy = httpHealth.checked
          ? httpHealth.healthy
          : httpHealth.error
            ? false // If there was an error, mark as unhealthy
            : true; // If no ports (no check needed), assume healthy

        const overallHealthy =
          running &&
          (!dockerHealth || dockerHealth === "healthy") &&
          applicationHealthy;

        const report: ContainerHealthReport = {
          containerName,
          containerRunning: running,
          containerStatus: status,
          containerHealth: dockerHealth,
          httpHealthStatus:
            httpHealth.checked || httpHealth.error ? httpHealth : undefined,
          applicationHealthy,
          overallHealthy,
          issues,
        };

        reports.push(report);

        // Track unhealthy containers
        if (!overallHealthy) {
          unhealthyContainers.push(containerName);
        }

        // 🔥 NEW: Track application-level unhealthy containers separately
        if (!applicationHealthy) {
          applicationUnhealthyContainers.push(containerName);
          console.log(
            `🚨 [HealthCheckScanner] ${containerName} is APPLICATION UNHEALTHY`,
          );
        }

        console.log(
          `✅ [HealthCheckScanner] ${containerName}: overall=${overallHealthy}, app=${applicationHealthy}, issues=${issues.length}`,
        );
        if (issues.length > 0) {
          console.log(`   Issues: ${issues.join(", ")}`);
        }
      } catch (err) {
        console.error(
          `❌ [HealthCheckScanner] Error scanning ${containerName}:`,
          (err as Error).message,
        );
        reports.push({
          containerName,
          containerRunning: false,
          containerStatus: "error",
          applicationHealthy: false,
          overallHealthy: false,
          issues: [`Scan error: ${(err as Error).message}`],
        });
        unhealthyContainers.push(containerName);
      }
    }

    const healthyCount = reports.filter((r) => r.overallHealthy).length;
    const result: HealthCheckScannerResult = {
      success: true,
      scannedCount: reports.length,
      healthyCount,
      unhealthyCount: unhealthyContainers.length,
      unhealthyContainers,
      applicationUnhealthyContainers,
      reports,
      timestamp: new Date().toISOString(),
    };

    console.log("\n📊 [HealthCheckScanner] Scan complete:");
    console.log(`   Scanned: ${result.scannedCount}`);
    console.log(`   Healthy: ${result.healthyCount}`);
    console.log(`   Unhealthy: ${result.unhealthyCount}`);
    console.log(
      `   App Unhealthy: ${result.applicationUnhealthyContainers.length}`,
    );
    console.log(`   Unhealthy containers:`, result.unhealthyContainers);
    console.log(
      `   App unhealthy containers:`,
      result.applicationUnhealthyContainers,
    );

    return result;
  } catch (err) {
    console.error(
      "❌ [HealthCheckScanner] Fatal error:",
      (err as Error).message,
    );
    return {
      success: false,
      scannedCount: 0,
      healthyCount: 0,
      unhealthyCount: 0,
      unhealthyContainers: [],
      applicationUnhealthyContainers: [],
      reports: [],
      timestamp: new Date().toISOString(),
      error: (err as Error).message,
    };
  }
}
