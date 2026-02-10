/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ====================================
// 🔧 ARCHESTRA CONFIGURATION
// ====================================

/**
 * Get Archestra MCP endpoint from environment
 */
function getArchestraEndpoint(): string {
  if (process.env.ARCHESTRA_MCP_ENDPOINT) {
    return process.env.ARCHESTRA_MCP_ENDPOINT;
  }

  if (process.env.ARCHESTRA_PROXY_URL && process.env.GATEWAY_ID) {
    const baseUrl = process.env.ARCHESTRA_PROXY_URL.replace(/\/$/, "");
    return `${baseUrl}/v1/mcp/${process.env.GATEWAY_ID}`;
  }

  console.warn("⚠️ [MCP Client] Using fallback endpoint");
  return "http://localhost:9000/v1/mcp/dac6e444-f791-423b-b724-4df4edae8182";
}

/**
 * Get Archestra auth token from environment
 */
/**
 * Get Archestra MCP token from environment
 */
function getArchestraToken(): string {
  // ✅ correct token for MCP gateway
  if (process.env.ARCHESTRA_MCP_TOKEN) {
    return process.env.ARCHESTRA_MCP_TOKEN;
  }

  throw new Error(
    "❌ ARCHESTRA_MCP_TOKEN not set — MCP gateway requires MCP token",
  );
}

const ARCHESTRA_ENDPOINT = getArchestraEndpoint();
const ARCHESTRA_TOKEN = getArchestraToken();

console.log("🔧 [MCP Client] Configuration:");
console.log("   📡 Endpoint:", ARCHESTRA_ENDPOINT);
console.log("   🔑 Token:", ARCHESTRA_TOKEN.substring(0, 20) + "...");

// ====================================
// 🔌 MCP CLIENT SETUP
// ====================================

const transport = new StreamableHTTPClientTransport(
  new URL(ARCHESTRA_ENDPOINT),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${ARCHESTRA_TOKEN}`,
      },
    },
  },
);

const client = new Client(
  { name: "agent-mesh-client", version: "1.0.0" },
  { capabilities: {} },
);

let connectPromise: Promise<void> | null = null;

async function ensureConnected() {
  if (!connectPromise) {
    console.log("🔌 [MCP Client] Connecting to Archestra...");
    connectPromise = client.connect(transport);
  }
  await connectPromise;
  console.log("✅ [MCP Client] Connected");
}

/**
 * Execute MCP tool via Archestra Gateway
 */
export async function executeMCPTool({
  tool,
  arguments: args,
}: {
  tool: string;
  arguments: any;
}) {
  await ensureConnected();
  return client.callTool({
    name: tool,
    arguments: args,
  });
}

/**
 * Test connection to Archestra
 */
export async function testConnection(): Promise<boolean> {
  try {
    await ensureConnected();
    const tools = await client.listTools();
    console.log("✅ [MCP Client] Connection test passed");
    console.log(
      "   Available tools:",
      tools.tools?.map((t: any) => t.name) || [],
    );
    return true;
  } catch (error: any) {
    console.error("❌ [MCP Client] Connection test failed:", error.message);
    return false;
  }
}

export async function listTools(): Promise<any[]> {
  try {
    await ensureConnected();
    const result = await client.listTools();
    return result.tools || [];
  } catch (error: any) {
    console.error("❌ [MCP Client] Failed to list tools:", error.message);
    return [];
  }
}
