/* eslint-disable @typescript-eslint/no-explicit-any */
import { executeMCPTool as executeMCPToolDirect } from "./mcp.client";

// ====================================
// 🗺️ TOOL NAME MAPPING
// ====================================

/**
 * Map node types to MCP tool names
 */
const toolNameMap: Record<string, string> = {
  "tool.httpHealth": "agent-mesh-tools__check_http_health",

  "tool.dockerStatus": "agent-mesh-tools__docker_status",
  "tool.dockerLogs": "agent-mesh-tools__docker_logs",
  "tool.dockerRestart": "agent-mesh-tools__docker_restart",
  "tool.dockerRollback": "agent-mesh-tools__docker_rollback",
  "tool.dockerListAll": "agent-mesh-tools__docker_list_all",
  "tool.dockerBulkRestart": "agent-mesh-tools__docker_bulk_restart",
  "tool.dockerBulkLogs": "agent-mesh-tools__docker_bulk_logs",
  "monitor.getMetrics": "agent-mesh-tools__monitor_get_metrics",
  "monitor.getAlerts": "agent-mesh-tools__monitor_get_alerts",
  "tool.dockerStop": "agent-mesh-tools__docker_stop",
  "tool.dockerStart": "agent-mesh-tools__docker_start",
  "tool.dockerRemove": "agent-mesh-tools__docker_remove",
  "tool.dockerPruneSystem": "agent-mesh-tools__docker_prune_system",

  "tool.slackNotify": "agent-mesh-tools__slack_notify",
  "agent.aiAnalyzer": "agent-mesh-tools__ai_analyze_logs",
  "tool.healthCheckScanner": "agent-mesh-tools__health_check_scanner",
};
/**
 * Map node type to tool name
 */
export function mapNodeTypeToToolName(nodeType: string): string {
  return toolNameMap[nodeType] || nodeType;
}

// ====================================
// 🛠️ MAIN EXECUTION FUNCTION
// ====================================

/**
 * Execute an MCP tool by node type
 * This is the main function used by the workflow executor
 */
export async function executeMCPTool(
  nodeType: string,
  config: any,
): Promise<any> {
  const toolName = toolNameMap[nodeType];
  if (!toolName) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }

  try {
    console.log(`🔧 [MCP Registry] Executing node type: ${nodeType}`);
    console.log(`🔧 [MCP Registry] Tool name: ${toolName}`);

    // 🔧 Special handling for AI Analyzer
    if (nodeType === "agent.aiAnalyzer") {
      config = normalizeAIAnalyzerConfig(config);
    }

    // Normalize containerNames for all tools that use it
    if (config.containerNames) {
      config = {
        ...config,
        containerNames: normalizeContainerNames(config.containerNames),
      };
    }

    console.log(`📦 [MCP Registry] Config:`, JSON.stringify(config, null, 2));

    // Call the MCP client
    const response = await executeMCPToolDirect({
      tool: toolName,
      arguments: config,
    });

    console.log(
      `✅ [MCP Registry] Raw response:`,
      JSON.stringify(response, null, 2),
    );

    // Parse the MCP response
    if (response.content && Array.isArray(response.content)) {
      // Check for error responses
      if (response.isError === true) {
        const errorContent = response.content[0];
        console.error(`❌ [MCP Registry] Tool Error:`, errorContent.text);
        throw new Error(errorContent.text);
      }

      // Parse successful response
      const content = response.content[0];
      if (content.type === "text") {
        try {
          const toolOutput = JSON.parse(content.text);
          console.log(
            `🎯 [MCP Registry] PARSED OUTPUT:`,
            JSON.stringify(toolOutput, null, 2),
          );
          return toolOutput;
        } catch (e) {
          console.error(`❌ [MCP Registry] Failed to parse content.text:`, e);
          // If parsing fails but it's not an error response, return raw text
          return { success: true, result: content.text };
        }
      }
    }

    // Fallback: return the entire response
    console.log(`⚠️ [MCP Registry] Using fallback return`);
    return response || { success: true };
  } catch (error: any) {
    console.error(`❌ [MCP Registry] Execution failed:`, error.message);
    console.error(`Stack:`, error.stack);
    throw new Error(`MCP Tool Error: ${error.message}`);
  }
}

// ====================================
// 🔧 HELPER FUNCTIONS
// ====================================

/**
 * Normalize container names to ensure clean string array
 */
function normalizeContainerNames(containerNames: any): string[] {
  if (!containerNames) {
    return [];
  }

  if (Array.isArray(containerNames)) {
    return containerNames
      .filter(
        (name: any) =>
          name != null && typeof name === "string" && name.trim().length > 0,
      )
      .map((name: any) => name.trim());
  }

  // Single string
  if (typeof containerNames === "string" && containerNames.trim().length > 0) {
    return [containerNames.trim()];
  }

  return [];
}

/**
 * Normalize AI Analyzer config to handle different input formats
 */
function normalizeAIAnalyzerConfig(config: any): any {
  console.log("🔧 [Normalize] Input config:", JSON.stringify(config, null, 2));

  // If logs is missing or null, create empty object
  if (!config.logs) {
    console.log("⚠️ [Normalize] No logs provided, using empty object");
    return {
      ...config,
      logs: {},
      containerNames: config.containerNames || [],
    };
  }

  // If logs is already a string or object, keep it
  if (typeof config.logs === "string" || typeof config.logs === "object") {
    console.log("✅ [Normalize] Logs format is valid");
    return {
      ...config,
      containerNames: config.containerNames || [],
    };
  }

  // If logs is an array
  if (Array.isArray(config.logs)) {
    console.log("🔄 [Normalize] Converting array to object");

    // If array is empty
    if (config.logs.length === 0) {
      return {
        ...config,
        logs: {},
        containerNames: [],
      };
    }

    // If array has containerNames alongside
    if (config.containerNames && Array.isArray(config.containerNames)) {
      const logsObject: Record<string, string> = {};
      config.containerNames.forEach((name: string, index: number) => {
        logsObject[name] = config.logs[index] || "";
      });

      return {
        ...config,
        logs: logsObject,
        containerNames: config.containerNames,
      };
    }

    // Fallback: join array into single string
    return {
      ...config,
      logs: config.logs.join("\n\n=== NEXT LOG ===\n\n"),
      containerNames: config.containerNames || [],
    };
  }

  console.log("⚠️ [Normalize] Unexpected logs format, using as-is");
  return config;
}

// ====================================
// 🧪 TESTING FUNCTIONS
// ====================================

/**
 * Test MCP connection
 */
export async function testMCPConnection(): Promise<boolean> {
  try {
    const { testConnection } = await import("./mcp.client");
    return await testConnection();
  } catch (error: any) {
    console.error(`❌ [MCP Registry] Connection test failed:`, error.message);
    return false;
  }
}

/**
 * List available tools
 */
export async function listAvailableTools(): Promise<any[]> {
  try {
    const { listTools } = await import("./mcp.client");
    return await listTools();
  } catch (error: any) {
    console.error(`❌ [MCP Registry] Failed to list tools:`, error.message);
    return [];
  }
}
