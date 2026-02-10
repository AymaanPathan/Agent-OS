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
        helperText: "How often to check",
      },
      {
        key: "alertOnChange",
        label: "Alert on Changes",
        type: "boolean",
        default: true,
        helperText: "Trigger alerts when state changes",
      },
    ],
  },
};
