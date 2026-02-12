export type DockerConfig = {
  socketPath?: string;
  host?: string;
  port?: number;
};

export const getDockerConfig = (): DockerConfig => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // In production, users will connect their own Docker
    return {
      socketPath: undefined,
      host: process.env.DOCKER_HOST || undefined,
      port: process.env.DOCKER_PORT
        ? parseInt(process.env.DOCKER_PORT)
        : undefined,
    };
  }

  // Local development - use Docker socket
  return {
    socketPath: "/var/run/docker.sock",
  };
};

/**
 * Build Docker command with proper host configuration
 */
export const buildDockerCommand = (command: string): string => {
  const config = getDockerConfig();

  if (config.host && config.port) {
    // Remote Docker connection
    return `docker -H tcp://${config.host}:${config.port} ${command}`;
  }

  // Local Docker connection
  return `docker ${command}`;
};

/**
 * Get Docker host string for logging
 */
export const getDockerHostString = (): string => {
  const config = getDockerConfig();

  if (config.host && config.port) {
    return `tcp://${config.host}:${config.port}`;
  }

  return "unix:///var/run/docker.sock";
};
