import axios from "axios";

const BASE = process.env.ARCHESTRA_PROXY_URL || "http://localhost:9000";
const TOKEN = process.env.ARCHESTRA_AUTH_TOKEN!;

export async function callA2AAgent(agentId: string, payload: any) {
  const url = `${BASE}/v1/a2a/${agentId}`;

  console.log("🤖 [A2A] Calling agent:", agentId);
  console.log("📦 [A2A] Payload:", JSON.stringify(payload, null, 2));

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });

  console.log("✅ [A2A] Agent response received");
  return res.data;
}
