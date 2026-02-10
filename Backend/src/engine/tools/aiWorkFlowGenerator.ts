/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import crypto from "crypto";

// ====================================
// 🤖 AI WORKFLOW GENERATOR (PRODUCTION)
// ====================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export type WorkflowGenerationRequest = {
  prompt: string;
  context?: string;
  nodeLibrary?: {
    nodes: any[];
    configs: Record<string, any>;
  };
};

export type GeneratedWorkflow = {
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  reasoning: string;
};

/**
 * Generate a workflow using Groq AI based on user prompt
 */
export async function generateWorkflowFromPrompt(
  request: WorkflowGenerationRequest,
): Promise<GeneratedWorkflow> {
  const { prompt, context, nodeLibrary } = request;

  console.log("🤖 [AgentOS AI] Generating workflow...");
  console.log("📝 Prompt:", prompt);

  const systemPrompt = buildSystemPrompt(nodeLibrary);
  const userPrompt = buildUserPrompt(prompt, context);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3, // lower = safer & deterministic
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) throw new Error("No response from AI");

  console.log("📥 [AI RAW RESPONSE]", responseText);

  const aiResponse = JSON.parse(responseText);
  const workflow = transformAIResponse(aiResponse);

  console.log("✅ Workflow Generated:", workflow.name);
  return workflow;
}

// ====================================
// 🧠 SYSTEM PROMPT (SRE-GRADE)
// ====================================

function buildSystemPrompt(nodeLibrary?: {
  nodes: any[];
  configs: Record<string, any>;
}): string {
  let nodeDocumentation = "";

  if (nodeLibrary?.nodes && nodeLibrary?.configs) {
    const nodesByCategory: Record<string, any[]> = {};

    nodeLibrary.nodes.forEach((node) => {
      if (!nodesByCategory[node.category]) {
        nodesByCategory[node.category] = [];
      }
      nodesByCategory[node.category].push(node);
    });

    nodeDocumentation = Object.entries(nodesByCategory)
      .map(([category, nodes]) => {
        const list = nodes
          .map((node) => {
            const cfg = nodeLibrary.configs[node.type];
            const fields = cfg?.fields
              ?.map(
                (f: any) =>
                  `      - ${f.label} (${f.type})${f.helperText ? `: ${f.helperText}` : ""}`,
              )
              .join("\n");

            return `  - ${node.type}
    Label: ${node.label}
    Description: ${node.desc}
    Configuration:
${fields || "      None"}`;
          })
          .join("\n\n");

        return `${category}:\n${list}`;
      })
      .join("\n\n");
  }

  return `
You are **AgentOS**, a senior Site Reliability Engineer (SRE) and DevOps architect.

You design **production-grade automation workflows**.
You do NOT guess. You do NOT hallucinate. You enforce safety.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IF/ELSE NODE EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "id": "router-1",
  "type": "logic.ifelse",
  "configuration": {
    "description": "Route based on container health",
    "conditions": [
      {
        "label": "Has Unhealthy Containers",
        "expression": "vars.unhealthyContainers > 0",
        "next": "fix-node-id"
      }
    ],
    "defaultNext": "notify-success-node-id"
  }
}

Corresponding edges:
{
  "source": "router-1",
  "target": "fix-node-id",
  "label": "Unhealthy"
},
{
  "source": "router-1",
  "target": "notify-success-node-id",
  "label": "All Healthy"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDGE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

edges: [
  {
    "source": "node-id-1",
    "target": "node-id-2",
    "label": "optional condition name"
  }
]

For If/Else nodes:
- Create separate edges for each condition
- Use the same source node ID for all branches
- Specify different target nodes based on conditions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE NODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${nodeDocumentation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VARIABLE CONTRACT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You may ONLY reference these variables:

vars = {
  targetService: string,
  targetContainer: string,
  healthUrl: string,
  unhealthyContainers: number,
  lastHealthPass: boolean,
  aiConfidence: number,
  recommendedAction: string,
  approvalGranted: boolean
}

Never invent values. Use variables if unknown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFETY RULES (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Destructive actions:
- tool.dockerRestart
- tool.dockerRollback
- tool.dockerBulkRestart

Rules:
- Destructive actions MUST have an Approval Gate before them
- If aiConfidence < 0.8 → Approval REQUIRED
- Always re-check health after a fix
- Always notify Slack on recovery or failure
- Never silently auto-fix production systems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIC RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use logic.ifelse ONLY if branching is required
- Prefer simple conditions:
  - vars.lastHealthPass === false
  - vars.unhealthyContainers > 0
  - vars.aiConfidence >= 0.8
- Do NOT create empty branches
- Do NOT create multiple conditions if one is enough

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW PATTERN (EXPECTED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Detect issue
2. Verify health
3. Inspect logs
4. AI analysis (optional)
5. Decide next action
6. Approval (if destructive)
7. Apply fix
8. Re-check health
9. Notify Slack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "name": "Workflow Name",
  "description": "What this workflow does",
  "reasoning": "Why this workflow is safe and correct",
  "nodes": [...],
  "edges": [...]
}

Before responding, VERIFY:
- No hardcoded infra values
- No unsafe fixes
- All edges are valid
- Approval exists where required
- Health is checked after fixes

You are designing workflows that run in PRODUCTION.
Act accordingly.
`;
}

// ====================================
// 🧾 USER PROMPT
// ====================================

function buildUserPrompt(prompt: string, context?: string): string {
  return `
Create a production-safe workflow for the following request:

${prompt}

${context ? `Context:\n${context}` : ""}

Return ONLY valid JSON in the required format.
`;
}

// ====================================
// 🔄 TRANSFORM AI RESPONSE
// ====================================

function transformAIResponse(aiResponse: any): GeneratedWorkflow {
  const { name, description, reasoning, nodes, edges } = aiResponse;

  if (!name || !nodes || !edges) {
    throw new Error("Invalid AI response: missing required fields");
  }

  // Transform nodes - keep them simple for frontend processing
  const transformedNodes = nodes.map((node: any) => {
    if (!node.id) {
      node.id = `${node.type || "node"}-${crypto.randomUUID()}`;
    }

    return {
      id: node.id,
      type: node.type,
      configuration: node.configuration || {},
    };
  });

  // ✅ Transform edges to use from/to format (matches frontend expectation)
  const transformedEdges = edges.map((edge: any) => ({
    from: edge.source || edge.from, // Support both formats for flexibility
    to: edge.target || edge.to, // Support both formats
    condition: edge.label || edge.condition || "",
  }));

  return {
    name,
    description,
    reasoning,
    nodes: transformedNodes,
    edges: transformedEdges,
  };
}

// ====================================
// 🧪 EXAMPLE PROMPTS
// ====================================

export const examplePrompts = [
  {
    title: "SRE Auto Recovery",
    prompt:
      "One of my production services is unhealthy. Investigate the issue, analyze logs, ask for approval before fixing, recover it safely, and notify Slack.",
  },
  {
    title: "Self-Healing Docker",
    prompt:
      "Monitor Docker containers continuously. If any container becomes unhealthy, diagnose and recover it safely with approval.",
  },
];
