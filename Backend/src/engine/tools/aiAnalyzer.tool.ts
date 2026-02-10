import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ====================================
// 🧠 AI LOG ANALYZER (IMPROVED)
// ====================================

export type AIAnalyzerConfig = {
  logs: string | Record<string, string> | string[]; // Support multiple formats
  containerNames?: string[]; // Optional container name context
  context?: string;
  provider?: "groq" | "openai";
  model?: string;
};

export type ErrorCategory =
  | "crash"
  | "memory_leak"
  | "network_timeout"
  | "database_error"
  | "permission_denied"
  | "configuration_error"
  | "dependency_failure"
  | "resource_exhaustion"
  | "unknown";

export type AIAnalysisResult = {
  success: boolean;
  summary: string;
  rootCause: string;
  errorCategory: ErrorCategory;
  affectedServices: string[];
  suggestedFixes: string[];
  confidence: "high" | "medium" | "low";
  keyLogLines: string[];
  timestamp: string;
  error?: string;
  containerAnalysis?: Array<{
    containerName: string;
    status: string;
    issues: string[];
  }>;
};

/**
 * Normalize logs input to a consistent format
 */
function normalizeLogs(
  logs: string | Record<string, string> | string[],
  containerNames?: string[],
): { text: string; containers: string[] } {
  let logsText = "";
  let containers: string[] = [];

  // Case 1: Single string log
  if (typeof logs === "string") {
    logsText = logs;
    if (containerNames && containerNames.length > 0) {
      containers = containerNames;
    }
  }
  // Case 2: Array of logs
  else if (Array.isArray(logs)) {
    if (logs.length === 0) {
      return { text: "", containers: [] };
    }

    // If array of strings
    if (typeof logs[0] === "string") {
      logsText = logs.join("\n\n=== NEXT LOG ===\n\n");
      containers = containerNames || [];
    }
    // If array of objects (shouldn't happen but handle it)
    else {
      logsText = JSON.stringify(logs, null, 2);
    }
  }
  // Case 3: Object with container names as keys
  else if (typeof logs === "object" && logs !== null) {
    containers = Object.keys(logs);

    logsText = Object.entries(logs)
      .map(([containerName, logContent]) => {
        // Handle case where logContent might be an object
        const content =
          typeof logContent === "string"
            ? logContent
            : JSON.stringify(logContent, null, 2);

        return `
╔════════════════════════════════════════════════════════════════╗
  CONTAINER: ${containerName}
╚════════════════════════════════════════════════════════════════╝

${content}
`;
      })
      .join("\n\n");
  }

  return { text: logsText, containers };
}

/**
 * Validate and prepare logs for analysis
 */
function validateLogs(logsText: string): {
  valid: boolean;
  error?: string;
  truncated: boolean;
  originalLength: number;
} {
  if (!logsText || logsText.trim() === "") {
    return {
      valid: false,
      error: "No logs provided",
      truncated: false,
      originalLength: 0,
    };
  }

  if (logsText.includes("[object Object]")) {
    return {
      valid: false,
      error: "Logs contain unparsed objects",
      truncated: false,
      originalLength: logsText.length,
    };
  }

  const originalLength = logsText.length;
  const truncated = originalLength > 5000;

  return {
    valid: true,
    truncated,
    originalLength,
  };
}

/**
 * Main AI log analysis function
 */
export async function runAILogAnalysis(
  config: AIAnalyzerConfig,
): Promise<AIAnalysisResult> {
  try {
    console.log("🧠 [AI Analyzer] Starting analysis");
    console.log(
      "📦 [AI Analyzer] Raw config:",
      JSON.stringify(config, null, 2),
    );

    // Step 1: Normalize logs input
    const { text: logsText, containers } = normalizeLogs(
      config.logs,
      config.containerNames,
    );

    console.log("📝 [AI Analyzer] Normalized logs length:", logsText.length);
    console.log("📦 [AI Analyzer] Containers found:", containers);

    // Step 2: Validate logs
    const validation = validateLogs(logsText);

    if (!validation.valid) {
      console.error("❌ [AI Analyzer] Validation failed:", validation.error);
      return {
        success: false,
        summary: "Log validation failed",
        rootCause: validation.error || "Invalid log input",
        errorCategory: "unknown",
        affectedServices: containers,
        suggestedFixes: ["Ensure logs are properly formatted and not empty"],
        confidence: "low",
        keyLogLines: [],
        timestamp: new Date().toISOString(),
        error: validation.error,
      };
    }

    // Step 3: Truncate if needed (keep recent logs)
    let processedLogs = logsText;
    if (validation.truncated) {
      console.log(
        "✂️ [AI Analyzer] Truncating logs from",
        validation.originalLength,
        "to 5000 chars",
      );
      processedLogs = "...(earlier logs truncated)\n\n" + logsText.slice(-5000);
    }

    // Step 4: Build AI prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      processedLogs,
      containers,
      config.context,
    );

    console.log("🤖 [AI Analyzer] Calling Groq API...");
    console.log(
      "📊 [AI Analyzer] Model:",
      config.model || "llama-3.3-70b-versatile",
    );

    // Step 5: Call AI
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: config.model || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    console.log("📥 [AI Analyzer] Raw AI response:", responseText);

    // Step 6: Parse and validate response
    const cleanedResponse = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let analysis: any;
    try {
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error(
        "❌ [AI Analyzer] Failed to parse AI response:",
        parseError,
      );
      throw new Error("AI returned invalid JSON");
    }

    // Step 7: Build per-container analysis
    const containerAnalysis = containers.map((name) => ({
      containerName: name,
      status: analysis.affectedServices?.includes(name)
        ? "unhealthy"
        : "healthy",
      issues: analysis.affectedServices?.includes(name)
        ? [analysis.summary]
        : [],
    }));

    console.log("✅ [AI Analyzer] Analysis complete");

    return {
      success: true,
      summary: analysis.summary || "Analysis completed",
      rootCause: analysis.rootCause || "Unable to determine root cause",
      errorCategory: analysis.errorCategory || "unknown",
      affectedServices: analysis.affectedServices || containers,
      suggestedFixes: analysis.suggestedFixes || [],
      confidence: analysis.confidence || "low",
      keyLogLines: analysis.keyLogLines || [],
      timestamp: new Date().toISOString(),
      containerAnalysis,
    };
  } catch (err: any) {
    console.error("❌ [AI Analyzer] Error:", err.message);
    console.error("📚 [AI Analyzer] Stack trace:", err.stack);

    return {
      success: false,
      summary: "AI analysis failed",
      rootCause: err.message || "Unknown error during analysis",
      errorCategory: "unknown",
      affectedServices: config.containerNames || [],
      suggestedFixes: [
        "Review logs manually",
        "Check AI service connectivity",
        "Verify log format is valid",
      ],
      confidence: "low",
      keyLogLines: [],
      timestamp: new Date().toISOString(),
      error: err.message,
    };
  }
}

/**
 * Build system prompt for AI
 */
function buildSystemPrompt(): string {
  return `You are an expert SRE (Site Reliability Engineer) analyzing container logs.

Your task:
1. Identify the root cause of failures
2. Categorize the error type
3. Suggest concrete fixes
4. Extract the most critical log lines

Be concise, actionable, and technical.`;
}

/**
 * Build user prompt for AI
 */
function buildUserPrompt(
  logs: string,
  containers: string[],
  context?: string,
): string {
  const containerContext =
    containers.length > 0
      ? `\nContainers being analyzed: ${containers.join(", ")}`
      : "";

  return `Context: ${context || "Investigating container issues"}${containerContext}

Logs:
${logs}

Analyze these logs and respond in this EXACT JSON format (no markdown, no extra text):
{
  "summary": "One-line summary of the issue",
  "rootCause": "Detailed explanation of what went wrong",
  "errorCategory": "crash|memory_leak|network_timeout|database_error|permission_denied|configuration_error|dependency_failure|resource_exhaustion|unknown",
  "affectedServices": ["service1", "service2"],
  "suggestedFixes": ["Fix step 1", "Fix step 2", "Fix step 3"],
  "confidence": "high|medium|low",
  "keyLogLines": ["Important log line 1", "Important log line 2"]
}`;
}

// ====================================
// 🎯 SMART ERROR DETECTOR
// ====================================

export type ErrorPattern = {
  pattern: RegExp;
  category: ErrorCategory;
  severity: "critical" | "warning" | "info";
  description: string;
};

const errorPatterns: ErrorPattern[] = [
  {
    pattern: /FATAL|fatal error|segmentation fault|core dumped/i,
    category: "crash",
    severity: "critical",
    description: "Application crash detected",
  },
  {
    pattern: /out of memory|OOM|memory exhausted|heap overflow/i,
    category: "memory_leak",
    severity: "critical",
    description: "Memory exhaustion detected",
  },
  {
    pattern: /connection refused|ECONNREFUSED|connection timeout|ETIMEDOUT/i,
    category: "network_timeout",
    severity: "critical",
    description: "Network connectivity issue",
  },
  {
    pattern: /database error|SQL error|query failed|deadlock/i,
    category: "database_error",
    severity: "critical",
    description: "Database operation failed",
  },
  {
    pattern: /permission denied|access denied|EACCES|unauthorized/i,
    category: "permission_denied",
    severity: "warning",
    description: "Permission issue detected",
  },
  {
    pattern: /configuration error|invalid config|missing required/i,
    category: "configuration_error",
    severity: "warning",
    description: "Configuration problem",
  },
];

export function detectErrorPatterns(logs: string): {
  detectedErrors: Array<{
    category: ErrorCategory;
    severity: string;
    description: string;
    matchedLine: string;
  }>;
  hasCriticalErrors: boolean;
} {
  const detectedErrors: any[] = [];
  const logLines = logs.split("\n");

  for (const line of logLines) {
    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(line)) {
        detectedErrors.push({
          category: pattern.category,
          severity: pattern.severity,
          description: pattern.description,
          matchedLine: line.trim(),
        });
      }
    }
  }

  return {
    detectedErrors,
    hasCriticalErrors: detectedErrors.some((e) => e.severity === "critical"),
  };
}
