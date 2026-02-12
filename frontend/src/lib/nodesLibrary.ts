/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend

export const nodeCategories = [
  "Triggers",
  "Tools",
  "Logic & Safety",
  "Agents",
  "Agent Swarms", // ✨ NEW CATEGORY
] as const;

export type NodeCategory = (typeof nodeCategories)[number];

export type NodeDefinition = {
  type: string;
  label: string;
  desc: string;
  category: NodeCategory;
};

export const nodesLibrary: NodeDefinition[] = [
  {
    type: "swarm.incidentCommander",
    label: "Incident Commander",
    desc: "Orchestrates sub-agents to handle incidents autonomously",
    category: "Agent Swarms",
  },
  {
    type: "swarm.autoHealer",
    label: "Auto-Healing Swarm",
    desc: "Detects issues, analyzes, and auto-fixes with approval gates",
    category: "Agent Swarms",
  },
  {
    type: "swarm.logInvestigator",
    label: "Log Investigation Team",
    desc: "Multi-agent log analysis with voting consensus",
    category: "Agent Swarms",
  },

  // Sub-Agents (can be used individually or within swarms)
  {
    type: "agent.healthScout",
    label: "Health Scout",
    desc: "Scans containers and reports health issues",
    category: "Agents",
  },
  {
    type: "agent.logDetective",
    label: "Log Detective",
    desc: "Deep log analysis with pattern recognition",
    category: "Agents",
  },
  {
    type: "agent.recoveryStrategist",
    label: "Recovery Strategist",
    desc: "Plans optimal recovery strategies based on incident type",
    category: "Agents",
  },
  {
    type: "agent.securityAuditor",
    label: "Security Auditor",
    desc: "Checks for security issues and misconfigurations",
    category: "Agents",
  },
  // TOOLS
  {
    type: "tool.httpHealth",
    label: "HTTP Health Check",
    desc: "Check API endpoint health with fallback routing",
    category: "Tools",
  },
  {
    type: "tool.dockerStatus",
    label: "Docker Status",
    desc: "Check container status with routing options",
    category: "Tools",
  },
  {
    type: "tool.dockerLogs",
    label: "Docker Logs",
    desc: "Fetch container logs",
    category: "Tools",
  },
  {
    type: "tool.dockerRestart",
    label: "Docker Restart",
    desc: "Restart a container with success/failure routes",
    category: "Tools",
  },
  {
    type: "tool.dockerRollback",
    label: "Docker Rollback",
    desc: "Rollback to previous image",
    category: "Tools",
  },
  {
    type: "tool.dockerListAll",
    label: "List All Containers",
    desc: "Get all running containers with health routing",
    category: "Tools",
  },
  {
    type: "tool.dockerBulkRestart",
    label: "Bulk Restart",
    desc: "Restart multiple containers",
    category: "Tools",
  },
  {
    type: "tool.dockerBulkLogs",
    label: "Bulk Logs",
    desc: "Fetch logs from multiple containers",
    category: "Tools",
  },
  {
    type: "tool.healthCheckScanner",
    label: "Health Check Scanner",
    desc: "Scan containers with intelligent routing",
    category: "Tools",
  },
  {
    type: "tool.slackNotify",
    label: "Slack Notify",
    desc: "Send Slack notification",
    category: "Tools",
  },

  // LOGIC & SAFETY
  {
    type: "logic.approval",
    label: "Approval Gate",
    desc: "Wait for manual approval with approve/deny routes",
    category: "Logic & Safety",
  },

  // AGENTS
  {
    type: "agent.aiAnalyzer",
    label: "AI Log Analyzer",
    desc: "Analyze logs with AI confidence-based routing",
    category: "Agents",
  },
];
