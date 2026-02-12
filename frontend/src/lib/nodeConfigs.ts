/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multiselect";

export type NodeConfigField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helperText?: string;
  default?: any;
  options?: Array<{ label: string; value: string }>;
};

export type NodeConfig = {
  title: string;
  fields: NodeConfigField[];
};

export const nodeConfigs: Record<string, NodeConfig> = {
  // TOOLS

  "swarm.incidentCommander": {
    title: "Incident Commander Swarm",
    fields: [
      {
        key: "goal",
        label: "Mission Objective",
        type: "textarea",
        default: "Handle container incidents automatically and safely",
        placeholder: "Describe what this swarm should accomplish...",
        helperText: "The high-level goal for the agent swarm",
      },
      {
        key: "enabledAgents",
        label: "Active Sub-Agents",
        type: "multiselect",
        default: ["healthScout", "logDetective", "recoveryStrategist"],
        options: [
          { label: "🏥 Health Scout", value: "healthScout" },
          { label: "🔍 Log Detective", value: "logDetective" },
          { label: "🛠️ Recovery Strategist", value: "recoveryStrategist" },
          { label: "🔒 Security Auditor", value: "securityAuditor" },
        ],
        helperText: "Which specialized agents should be available",
      },
      {
        key: "autoFixEnabled",
        label: "Enable Auto-Fix",
        type: "boolean",
        default: false,
        helperText: "Allow swarm to execute fixes automatically",
      },
      {
        key: "approvalRequired",
        label: "Require Approval for Destructive Actions",
        type: "boolean",
        default: true,
        helperText: "Gate destructive actions behind human approval",
      },
      {
        key: "confidenceThreshold",
        label: "Auto-Fix Confidence Threshold",
        type: "number",
        default: 0.85,
        helperText: "Minimum confidence (0-1) to auto-fix without approval",
      },
      {
        key: "maxConcurrentAgents",
        label: "Max Concurrent Agents",
        type: "number",
        default: 3,
        helperText: "How many sub-agents can work in parallel",
      },
    ],
  },

  "swarm.autoHealer": {
    title: "Auto-Healing Swarm",
    fields: [
      {
        key: "monitorInterval",
        label: "Scan Interval (seconds)",
        type: "number",
        default: 30,
        helperText: "How often to check for issues",
      },
      {
        key: "healingStrategy",
        label: "Healing Strategy",
        type: "select",
        default: "progressive",
        options: [
          { label: "Conservative (restart only)", value: "conservative" },
          { label: "Progressive (restart → rollback)", value: "progressive" },
          { label: "Aggressive (rollback first)", value: "aggressive" },
        ],
      },
      {
        key: "maxHealAttempts",
        label: "Max Healing Attempts",
        type: "number",
        default: 3,
        helperText: "Stop after this many failed attempts",
      },
      {
        key: "notifyOnHeal",
        label: "Slack Notification on Heal",
        type: "boolean",
        default: true,
      },
    ],
  },

  "swarm.logInvestigator": {
    title: "Log Investigation Team",
    fields: [
      {
        key: "votingEnabled",
        label: "Enable Agent Voting",
        type: "boolean",
        default: true,
        helperText: "3 agents analyze independently and vote on root cause",
      },
      {
        key: "analysisDepth",
        label: "Analysis Depth",
        type: "select",
        default: "deep",
        options: [
          { label: "Quick Scan", value: "quick" },
          { label: "Standard Analysis", value: "standard" },
          { label: "Deep Investigation", value: "deep" },
        ],
      },
      {
        key: "logSources",
        label: "Log Sources",
        type: "textarea",
        placeholder: "{{step.bulkLogs.logs}}",
        helperText: "Template variable pointing to logs",
      },
    ],
  },

  // Individual Sub-Agents
  "agent.healthScout": {
    title: "Health Scout Agent",
    fields: [
      {
        key: "scanScope",
        label: "Scan Scope",
        type: "select",
        default: "all",
        options: [
          { label: "All Containers", value: "all" },
          { label: "Running Only", value: "running" },
          { label: "Specific Names", value: "specific" },
        ],
      },
      {
        key: "containerNames",
        label: "Container Names (if specific)",
        type: "textarea",
        placeholder: "api-server, worker-1, cache",
      },
      {
        key: "includeHttpChecks",
        label: "Include HTTP Health Checks",
        type: "boolean",
        default: true,
      },
    ],
  },

  "agent.logDetective": {
    title: "Log Detective Agent",
    fields: [
      {
        key: "logs",
        label: "Logs to Analyze",
        type: "textarea",
        placeholder: "{{step.healthScout.logs}}",
      },
      {
        key: "focusAreas",
        label: "Focus Areas",
        type: "multiselect",
        default: ["errors", "crashes"],
        options: [
          { label: "Errors", value: "errors" },
          { label: "Crashes", value: "crashes" },
          { label: "Performance", value: "performance" },
          { label: "Security", value: "security" },
        ],
      },
      {
        key: "aiModel",
        label: "AI Model",
        type: "select",
        default: "llama-3.3-70b-versatile",
        options: [
          { label: "Llama 3.3 70B (Fast)", value: "llama-3.3-70b-versatile" },
          { label: "Llama 3.1 70B (Stable)", value: "llama-3.1-70b-versatile" },
        ],
      },
    ],
  },

  "agent.recoveryStrategist": {
    title: "Recovery Strategist Agent",
    fields: [
      {
        key: "incidentContext",
        label: "Incident Context",
        type: "textarea",
        placeholder: "{{step.logDetective.rootCause}}",
        helperText: "What the detective found",
      },
      {
        key: "riskTolerance",
        label: "Risk Tolerance",
        type: "select",
        default: "low",
        options: [
          { label: "Low (safest)", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High (fastest)", value: "high" },
        ],
      },
    ],
  },

  "agent.securityAuditor": {
    title: "Security Auditor Agent",
    fields: [
      {
        key: "auditScope",
        label: "Audit Scope",
        type: "multiselect",
        default: ["permissions", "ports"],
        options: [
          { label: "Container Permissions", value: "permissions" },
          { label: "Exposed Ports", value: "ports" },
          { label: "Environment Variables", value: "env" },
          { label: "Network Config", value: "network" },
        ],
      },
    ],
  },
  "tool.httpHealth": {
    title: "HTTP Health Check",
    fields: [
      {
        key: "url",
        label: "URL",
        type: "text",
        placeholder: "http://localhost:3000/health",
        helperText: "The endpoint to check",
      },
      {
        key: "expectedStatus",
        label: "Expected Status Code",
        type: "number",
        default: 200,
        helperText: "Expected HTTP status code",
      },
      {
        key: "timeout",
        label: "Timeout (ms)",
        type: "number",
        default: 5000,
        helperText: "Request timeout in milliseconds",
      },
      {
        key: "retries",
        label: "Retries",
        type: "number",
        default: 1,
        helperText: "Number of retry attempts",
      },
    ],
  },

  "tool.dockerStatus": {
    title: "Docker Container Status",
    fields: [
      {
        key: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-app",
        helperText: "Name of the Docker container",
      },
    ],
  },

  "tool.dockerLogs": {
    title: "Docker Container Logs",
    fields: [
      {
        key: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-app",
        helperText: "Name of the Docker container",
      },
      {
        key: "tail",
        label: "Tail Lines",
        type: "number",
        default: 100,
        helperText: "Number of recent log lines to fetch",
      },
      {
        key: "timestamps",
        label: "Include Timestamps",
        type: "boolean",
        default: false,
      },
    ],
  },

  "tool.dockerRestart": {
    title: "Docker Container Restart",
    fields: [
      {
        key: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-app",
        helperText: "Name of the Docker container to restart",
      },
      {
        key: "timeout",
        label: "Timeout (seconds)",
        type: "number",
        default: 10,
        helperText: "Time to wait before killing the container",
      },
    ],
  },

  "tool.dockerRollback": {
    title: "Docker Container Rollback",
    fields: [
      {
        key: "containerName",
        label: "Container Name",
        type: "text",
        placeholder: "my-app",
        helperText: "Name of the Docker container",
      },
      {
        key: "rollbackImage",
        label: "Rollback Image",
        type: "text",
        placeholder: "myapp:v1.0.0",
        helperText: "Previous image to rollback to",
      },
      {
        key: "preserveVolumes",
        label: "Preserve Volumes",
        type: "boolean",
        default: true,
      },
      {
        key: "preserveNetwork",
        label: "Preserve Network",
        type: "boolean",
        default: true,
      },
    ],
  },

  "tool.dockerListAll": {
    title: "List All Containers",
    fields: [
      {
        key: "filters",
        label: "Filters (optional)",
        type: "text",
        placeholder: "status=running",
        helperText: "Docker filter expressions",
      },
      {
        key: "includeStats",
        label: "Include Stats",
        type: "boolean",
        default: false,
        helperText: "Include CPU/memory stats",
      },
    ],
  },

  "tool.dockerBulkRestart": {
    title: "Bulk Container Restart",
    fields: [
      {
        key: "containerNames",
        label: "Container Names",
        type: "textarea",
        placeholder: "container1, container2, container3",
        helperText:
          "Comma-separated list or use {{step.nodeId.unhealthyContainers}}",
      },
      {
        key: "timeout",
        label: "Timeout (seconds)",
        type: "number",
        default: 10,
      },
      {
        key: "continueOnError",
        label: "Continue on Error",
        type: "boolean",
        default: true,
      },
    ],
  },

  "tool.dockerBulkLogs": {
    title: "Bulk Container Logs",
    fields: [
      {
        key: "containerNames",
        label: "Container Names",
        type: "textarea",
        placeholder: "container1, container2",
        helperText: "Comma-separated list of containers",
      },
      {
        key: "tail",
        label: "Tail Lines",
        type: "number",
        default: 100,
      },
    ],
  },

  "tool.healthCheckScanner": {
    title: "Health Check Scanner",
    fields: [
      {
        key: "scanAllRunning",
        label: "Scan All Running Containers",
        type: "boolean",
        default: true,
        helperText: "Automatically scan all running containers",
      },
      {
        key: "containerNames",
        label: "Specific Containers (optional)",
        type: "textarea",
        placeholder: "container1, container2",
        helperText: "Leave empty to scan all, or specify comma-separated names",
      },
      {
        key: "timeout",
        label: "HTTP Timeout (ms)",
        type: "number",
        default: 3000,
        helperText: "Timeout for HTTP health checks",
      },
    ],
  },

  "tool.slackNotify": {
    title: "Slack Notification",
    fields: [
      {
        key: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Workflow completed successfully!",
        helperText: "The message to send",
      },
      {
        key: "channel",
        label: "Channel (optional)",
        type: "text",
        placeholder: "#alerts",
        helperText: "Override default channel",
      },
      {
        key: "severity",
        label: "Severity",
        type: "select",
        default: "info",
        options: [
          { label: "Info", value: "info" },
          { label: "Success", value: "success" },
          { label: "Warning", value: "warning" },
          { label: "Error", value: "error" },
        ],
      },
      {
        key: "includeLogSnippet",
        label: "Include Log Snippet",
        type: "boolean",
        default: false,
        helperText: "Attach recent logs to notification",
      },
    ],
  },

  "logic.approval": {
    title: "Approval Gate",
    fields: [
      {
        key: "message",
        label: "Approval Message",
        type: "textarea",
        placeholder: "Please approve container restart",
        helperText: "Message shown to approver",
      },
    ],
  },

  // AGENTS
  "agent.aiAnalyzer": {
    title: "AI Log Analyzer",
    fields: [
      {
        key: "logs",
        label: "Logs to Analyze",
        type: "textarea",
        placeholder: "{{step.dockerLogs-123.logs}}",
        helperText: "Logs to analyze (use template variables)",
      },
      {
        key: "context",
        label: "Context (optional)",
        type: "text",
        placeholder: "Payment service crashed",
        helperText: "Additional context for AI",
      },
      {
        key: "model",
        label: "Model",
        type: "select",
        default: "llama-3.3-70b-versatile",
        options: [
          { label: "Llama 3.3 70B", value: "llama-3.3-70b-versatile" },
          { label: "Llama 3.1 70B", value: "llama-3.1-70b-versatile" },
        ],
      },
    ],
  },

  // MONITOR
  "monitor.continuous": {
    title: "Continuous Monitor",
    fields: [
      {
        key: "targets",
        label: "Monitor Targets",
        type: "select",
        default: "containers",
        options: [
          { label: "Containers", value: "containers" },
          { label: "APIs", value: "apis" },
          { label: "Resources", value: "resources" },
        ],
      },
      {
        key: "interval",
        label: "Check Interval (seconds)",
        type: "number",
        default: 30,
        helperText: "How often to check container health",
      },
      {
        key: "autoFix",
        label: "Enable AI Auto-Fix",
        type: "boolean",
        default: true,
        helperText: "Automatically fix critical issues using AI analysis",
      },
      {
        key: "alertOnChange",
        label: "Alert on Changes",
        type: "boolean",
        default: true,
        helperText: "Trigger alerts when state changes",
      },
      {
        key: "containerFilters",
        label: "Container Filters (optional)",
        type: "text",
        placeholder: "status=running",
        helperText: "Docker filter expressions",
      },
      {
        key: "thresholds",
        label: "Alert Thresholds",
        type: "text",
        placeholder: '{"cpu": 80, "memory": 80, "restartCount": 3}',
        helperText: "JSON object with cpu, memory, and restartCount thresholds",
      },
    ],
  },
};
