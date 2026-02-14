import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

export interface DockerConnectionConfig {
  mode: "local" | "remote";
  host?: string; // For remote connections (e.g., "tcp://192.168.1.100:2375")
}

export interface DockerConnectionStatus {
  connected: boolean;
  mode: "local" | "remote";
  host?: string;
  version?: string;
  containers?: number;
  error?: string;
  timestamp: string;
}

class DockerConnectionService {
  private config: DockerConnectionConfig;
  private connectionStatus: DockerConnectionStatus | null = null;
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30 seconds

  constructor() {
    // Initialize from environment variables
    const mode =
      (process.env.DOCKER_CONNECTION_MODE as "local" | "remote") || "local";
    const host = process.env.DOCKER_HOST;

    this.config = {
      mode,
      host: mode === "remote" ? host : undefined,
    };

    console.log("🐳 [Docker Connection] Initialized:", this.config);
  }

  /**
   * Get Docker command prefix based on connection mode
   */
  private getDockerCommand(command: string): string {
    if (this.config.mode === "remote" && this.config.host) {
      return `docker -H ${this.config.host} ${command}`;
    }
    return `docker ${command}`;
  }

  /**
   * Test Docker connection
   */
  async testConnection(): Promise<DockerConnectionStatus> {
    console.log("🔍 [Docker Connection] Testing connection...");

    try {
      // Test basic Docker connectivity
      const versionCmd = this.getDockerCommand(
        "version --format '{{.Server.Version}}'",
      );
      const { stdout: version } = await execAsync(versionCmd, {
        timeout: 5000,
      });

      // Get container count
      const psCmd = this.getDockerCommand("ps -q");
      const { stdout: containers } = await execAsync(psCmd, { timeout: 5000 });
      const containerCount = containers
        .trim()
        .split("\n")
        .filter(Boolean).length;

      // Get Docker info for additional details
      const infoCmd = this.getDockerCommand(
        "info --format '{{.ServerVersion}}'",
      );
      await execAsync(infoCmd, { timeout: 5000 });

      const status: DockerConnectionStatus = {
        connected: true,
        mode: this.config.mode,
        host: this.config.host,
        version: version.trim(),
        containers: containerCount,
        timestamp: new Date().toISOString(),
      };

      this.connectionStatus = status;
      this.lastCheckTime = Date.now();

      console.log("✅ [Docker Connection] Connection successful:", status);
      return status;
    } catch (error: any) {
      console.error("❌ [Docker Connection] Connection failed:", error.message);

      const status: DockerConnectionStatus = {
        connected: false,
        mode: this.config.mode,
        host: this.config.host,
        error: this.parseDockerError(error.message),
        timestamp: new Date().toISOString(),
      };

      this.connectionStatus = status;
      this.lastCheckTime = Date.now();

      return status;
    }
  }

  /**
   * Get cached connection status or test if cache expired
   */
  async getConnectionStatus(
    forceRefresh: boolean = false,
  ): Promise<DockerConnectionStatus> {
    const now = Date.now();
    const cacheExpired = now - this.lastCheckTime > this.checkInterval;

    if (!this.connectionStatus || cacheExpired || forceRefresh) {
      return await this.testConnection();
    }

    return this.connectionStatus;
  }

  /**
   * Check if Docker is connected
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.connected;
  }

  /**
   * Update Docker connection configuration
   */
  async updateConfiguration(
    config: DockerConnectionConfig,
  ): Promise<DockerConnectionStatus> {
    console.log("🔧 [Docker Connection] Updating configuration:", config);

    this.config = config;
    this.connectionStatus = null;
    this.lastCheckTime = 0;

    // Update environment variables for docker.config.ts
    if (config.mode === "remote" && config.host) {
      process.env.DOCKER_HOST = config.host;
      process.env.DOCKER_CONNECTION_MODE = "remote";
    } else {
      delete process.env.DOCKER_HOST;
      process.env.DOCKER_CONNECTION_MODE = "local";
    }

    return await this.testConnection();
  }

  /**
   * Get Docker host info
   */
  async getDockerInfo(): Promise<any> {
    if (!(await this.isConnected())) {
      throw new Error("Docker is not connected. Please connect Docker first.");
    }

    try {
      const infoCmd = this.getDockerCommand("info --format json");
      const { stdout } = await execAsync(infoCmd, { timeout: 10000 });
      return JSON.parse(stdout);
    } catch (error: any) {
      console.error("❌ [Docker Connection] Failed to get Docker info:", error);
      throw new Error(`Failed to get Docker info: ${error.message}`);
    }
  }

  /**
   * Parse Docker error messages into user-friendly format
   */
  private parseDockerError(errorMessage: string): string {
    if (errorMessage.includes("Cannot connect to the Docker daemon")) {
      return "Cannot connect to Docker daemon. Please ensure Docker is running.";
    }
    if (errorMessage.includes("permission denied")) {
      return "Permission denied. Please ensure your user has Docker permissions.";
    }
    if (errorMessage.includes("timeout")) {
      return "Connection timeout. Please check your Docker host configuration.";
    }
    if (errorMessage.includes("ECONNREFUSED")) {
      return "Connection refused. Please verify Docker is running and accessible.";
    }
    return errorMessage;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): DockerConnectionConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const dockerConnectionService = new DockerConnectionService();
