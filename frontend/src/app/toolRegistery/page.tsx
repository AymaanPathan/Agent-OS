/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Loader2,
  RefreshCw,
  Code,
  Server,
} from "lucide-react";
import { motion } from "framer-motion";

type Tool = {
  nodeType: string;
  server: string;
  toolName: string;
  status: "connected" | "error" | "unknown";
  connected: boolean;
  description: string;
  inputSchema?: any;
};

export default function ToolsRegistry() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const fetchTools = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8080/api/tools");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch tools");
      }

      setTools(data.tools || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTool = async (tool: Tool) => {
    setTestingTool(tool.nodeType);

    // Get test config based on tool type
    const testConfig = getTestConfig(tool.nodeType);

    try {
      const res = await fetch(
        `http://localhost:8080/api/tools/test/${tool.nodeType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testConfig),
        },
      );

      const data = await res.json();

      setTestResults((prev) => ({
        ...prev,
        [tool.nodeType]: data,
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [tool.nodeType]: { success: false, error: err.message },
      }));
    } finally {
      setTestingTool(null);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600 mx-auto mb-3" />
          <div className="text-sm text-zinc-600">Loading tools registry...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <div className="text-lg font-semibold text-zinc-900 mb-2">
            Failed to Connect
          </div>
          <div className="text-sm text-zinc-600 mb-4">{error}</div>
          <button
            onClick={fetchTools}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const connectedCount = tools.filter((t) => t.connected).length;
  const errorCount = tools.filter((t) => t.status === "error").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 shadow-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  MCP Tools Registry
                </h1>
                <p className="text-sm text-zinc-600">
                  Connected tools via Archestra
                </p>
              </div>
            </div>

            <button
              onClick={fetchTools}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-zinc-600" />
                <div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {tools.length}
                  </div>
                  <div className="text-xs text-zinc-500">Total Tools</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-green-200 bg-green-50 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    {connectedCount}
                  </div>
                  <div className="text-xs text-green-600">Connected</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-red-200 bg-red-50 shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-red-900">
                    {errorCount}
                  </div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool, idx) => {
            const isTesting = testingTool === tool.nodeType;
            const result = testResults[tool.nodeType];

            return (
              <motion.div
                key={tool.nodeType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Code className="h-4 w-4 text-zinc-600" />
                      <div className="text-sm font-semibold text-zinc-900">
                        {tool.nodeType}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 mb-2">
                      {tool.description}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                        {tool.server}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono">
                        {tool.toolName}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {tool.connected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-700">
                          Error
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Test Button */}
                {tool.connected && (
                  <div className="pt-3 border-t border-zinc-100">
                    <button
                      onClick={() => testTool(tool)}
                      disabled={isTesting}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 disabled:bg-zinc-400 transition"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Test Tool
                        </>
                      )}
                    </button>

                    {/* Test Result */}
                    {result && (
                      <div
                        className={`mt-3 p-3 rounded-xl text-xs ${
                          result.success
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        <div className="font-medium mb-1">
                          {result.success ? "✅ Test Passed" : "❌ Test Failed"}
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">
                          {result.error || "Tool executed successfully"}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ====================================
// TEST CONFIG GENERATOR
// ====================================

function getTestConfig(nodeType: string): Record<string, any> {
  switch (nodeType) {
    case "tool.httpHealth":
      return {
        url: "https://httpbin.org/status/200",
        expectedStatus: 200,
        timeout: 5000,
      };

    case "tool.dockerStatus":
      return {
        containerName: "test-container",
      };

    case "tool.dockerLogs":
      return {
        containerName: "test-container",
        tail: 10,
      };

    case "tool.slackNotify":
      return {
        webhookUrl: "https://hooks.slack.com/services/TEST",
        message: "Test notification from AgentOS Tools Registry",
      };

    default:
      return {};
  }
}
