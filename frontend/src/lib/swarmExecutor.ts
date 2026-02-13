/* eslint-disable @typescript-eslint/no-explicit-any */
const SWARM_API_URL =
  "http://localhost:9000/v1/a2a/333c740d-7abe-4c8e-b624-17f7dc4beb46";
const AUTH_TOKEN = "archestra_0408acd7a2e3a6c5d7057ccfdef407b0";

export interface SwarmRequest {
  goal: string;
  agents?: string[];
  safetyOptions?: Record<string, boolean>;
}

export interface SwarmResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute agent swarm with the given goal
 */
export async function executeSwarm(
  request: SwarmRequest,
): Promise<SwarmResponse> {
  try {
    console.log("🚀 [Swarm] Executing with goal:", request.goal);
    console.log("🤖 [Swarm] Enabled agents:", request.agents);

    const response = await fetch(SWARM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "message/send",
        params: {
          message: {
            parts: [
              {
                kind: "text",
                text: request.goal,
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || "Unknown error",
      };
    }

    if (data.result) {
      return {
        success: true,
        data: data.result,
      };
    }

    return {
      success: false,
      error: "No result returned from API",
    };
  } catch (error: any) {
    console.error("❌ [Swarm] Execution error:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

/**
 * Parse swarm response to extract structured data
 */
export function parseSwarmResponse(response: any): {
  parsed: any;
  rawText: string;
} {
  const rawText = response.parts?.[0]?.text || JSON.stringify(response);

  let parsed: any = {};
  try {
    // Try to find JSON in the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // If parsing fails, return raw text
    parsed = { rawResponse: rawText };
  }

  return { parsed, rawText };
}
