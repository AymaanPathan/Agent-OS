import axios from "axios";

// ====================================
// 📢 SLACK NOTIFY TOOL
// ====================================

export type SlackNotifyConfig = {
  webhookUrl: string;
  channel?: string;
  message: string;
  username?: string;
  includeLogSnippet?: boolean;
  logSnippet?: string;
  severity?: "info" | "success" | "warning" | "error";
  metadata?: Record<string, any>;
};

export type SlackNotifyResult = {
  success: boolean;
  channel?: string;
  message: string;
  timestamp: string;
  webhookUrl: string;
  error?: string;
  responseStatus?: number;
};

export async function runSlackNotify(config: SlackNotifyConfig) {
  try {
    const payload = buildSlackPayload(config);

    console.log(
      "📤 [SlackNotify] Webhook URL:",
      maskWebhookUrl(config.webhookUrl),
    );
    console.log("📤 [SlackNotify] Payload being sent:");
    console.dir(payload, { depth: 10 });

    const response = await axios.post(config.webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });

    console.log("✅ [SlackNotify] Response Status:", response.status);
    console.log("✅ [SlackNotify] Response Data:", response.data);

    return {
      success: response.status === 200,
      channel: config.channel,
      message: config.message,
      timestamp: new Date().toISOString(),
      webhookUrl: maskWebhookUrl(config.webhookUrl),
      responseStatus: response.status,
    };
  } catch (err: any) {
    console.log("❌ [SlackNotify] Error:", err.message);
    console.log("❌ [SlackNotify] Response:", err.response?.data);

    return {
      success: false,
      channel: config.channel,
      message: config.message,
      timestamp: new Date().toISOString(),
      webhookUrl: maskWebhookUrl(config.webhookUrl),
      error: err.message || "Failed to send Slack notification",
      responseStatus: err.response?.status,
    };
  }
}

// ====================================
// 🎨 BUILD SLACK MESSAGE PAYLOAD
// ====================================

function buildSlackPayload(config: SlackNotifyConfig) {
  const {
    message,
    username,
    channel,
    severity,
    includeLogSnippet,
    logSnippet,
    metadata,
  } = config;

  // Determine color based on severity
  const severityColors = {
    info: "#3B82F6", // blue
    success: "#10B981", // green
    warning: "#F59E0B", // orange
    error: "#EF4444", // red
  };

  const color = severityColors[severity || "info"];
  const emoji = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  }[severity || "info"];

  // Build blocks for rich formatting
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} AgentOS Workflow Notification`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    },
  ];

  // Add metadata if provided
  if (metadata && Object.keys(metadata).length > 0) {
    const metadataFields = Object.entries(metadata).map(([key, value]) => ({
      type: "mrkdwn",
      text: `*${key}:*\n${value}`,
    }));

    blocks.push({
      type: "section",
      fields: metadataFields.slice(0, 10), // Slack limit
    });
  }

  // Add log snippet if included
  if (includeLogSnippet && logSnippet) {
    blocks.push(
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Log Snippet:*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`${logSnippet.substring(0, 2000)}\`\`\``, // Truncate if too long
        },
      },
    );
  }

  // Add footer with timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Sent at: ${new Date().toLocaleString()} | Powered by *AgentOS*`,
      },
    ],
  });

  // Build final payload
  const payload: any = {
    blocks,
    attachments: [
      {
        color,
        fallback: message,
      },
    ],
  };

  // Add optional fields
  if (username) {
    payload.username = username;
  }

  if (channel) {
    payload.channel = channel;
  }

  return payload;
}

// ====================================
// 🔒 HELPER: MASK WEBHOOK URL
// ====================================

function maskWebhookUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");

    // Mask the webhook token (last part of path)
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.length > 8) {
        pathParts[pathParts.length - 1] =
          lastPart.substring(0, 4) +
          "****" +
          lastPart.substring(lastPart.length - 4);
      }
    }

    return `${urlObj.origin}${pathParts.join("/")}`;
  } catch {
    return "invalid-url";
  }
}
