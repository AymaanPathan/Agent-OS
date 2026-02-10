import axios, { AxiosError } from "axios";

export type HttpHealthConfig = {
  url: string;
  expectedStatus: number;
  timeout: number;
  retries?: number;
  retryDelay?: number;
};

export type HttpHealthResult = {
  success: boolean; // ✅ ADDED for If/Else router
  pass: boolean; // Keep for backward compatibility
  statusCode: number;
  latency: number;
  error?: string;
  responseTime: string;
  attempts: number;
  timestamp: string;
  responseBody?: any;
  responseHeaders?: Record<string, string>;
  contentType?: string;
  contentLength?: number;
};

export async function runHttpHealthCheck(
  config: HttpHealthConfig,
): Promise<HttpHealthResult> {
  const maxRetries = config.retries || 1;
  const retryDelay = config.retryDelay || 1000;

  let lastError: string | undefined;
  let attempts = 0;

  for (let i = 0; i < maxRetries; i++) {
    attempts++;
    const start = Date.now();

    try {
      const res = await axios.get(config.url, {
        timeout: config.timeout,
        validateStatus: () => true, // Don't throw on any status
        headers: {
          "User-Agent": "AgentOS-HealthCheck/1.0",
        },
      });

      const latency = Date.now() - start;
      const pass = res.status === config.expectedStatus;

      // Parse response body safely
      let responseBody: any;
      try {
        if (typeof res.data === "string") {
          responseBody =
            res.data.length > 1000
              ? res.data.substring(0, 1000) + "... (truncated)"
              : res.data;
        } else {
          responseBody = res.data;
        }
      } catch {
        responseBody = "Unable to parse response";
      }

      return {
        success: pass, // ✅ SUCCESS = pass (for If/Else router)
        pass, // Keep both for clarity
        statusCode: res.status,
        latency,
        responseTime: `${latency}ms`,
        attempts,
        timestamp: new Date().toISOString(),
        error: pass
          ? undefined
          : `Expected status ${config.expectedStatus}, got ${res.status}`,
        responseBody,
        responseHeaders: res.headers as Record<string, string>,
        contentType: res.headers["content-type"],
        contentLength: res.headers["content-length"]
          ? parseInt(res.headers["content-length"])
          : undefined,
      };
    } catch (err) {
      const latency = Date.now() - start;
      const error = err as AxiosError;

      lastError =
        error.code === "ECONNABORTED"
          ? `Timeout after ${config.timeout}ms`
          : error.code === "ECONNREFUSED"
            ? "Connection refused"
            : error.message || "Unknown error";

      // If this is the last retry, return failure
      if (i === maxRetries - 1) {
        return {
          success: false, // ✅ FAILED
          pass: false,
          statusCode: 0,
          latency,
          error: lastError,
          responseTime: `${latency}ms`,
          attempts,
          timestamp: new Date().toISOString(),
          responseBody: null,
          responseHeaders: {},
        };
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // Fallback (shouldn't reach here)
  return {
    success: false, // ✅ FAILED
    pass: false,
    statusCode: 0,
    latency: 0,
    error: lastError || "All retries failed",
    responseTime: "0ms",
    attempts,
    timestamp: new Date().toISOString(),
    responseBody: null,
    responseHeaders: {},
  };
}
