/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/workflow/components/RecoveryActions.tsx
export function RecoveryActions({ logs }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Recovery Actions
      </h3>
      <div className="text-xs text-zinc-500">
        {
          logs.filter(
            (l: any) =>
              l.message.includes("restart") || l.message.includes("recover"),
          ).length
        }{" "}
        recovery actions taken
      </div>
    </div>
  );
}

// src/components/workflow/components/HealthStatus.tsx
export function HealthStatus({ containers }: any) {
  const healthy = containers.filter((c: any) => c.isHealthy).length;
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Health Status
      </h3>
      <div className="text-2xl font-bold text-green-400">
        {healthy}/{containers.length}
      </div>
      <div className="text-xs text-zinc-500">Healthy Containers</div>
    </div>
  );
}

// src/components/workflow/components/LatencyGraph.tsx
export function LatencyGraph({ logs }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Latency Graph
      </h3>
      <div className="text-xs text-zinc-500">
        Performance metrics will appear here
      </div>
    </div>
  );
}

// src/components/workflow/components/SlowEndpoints.tsx
export function SlowEndpoints({ logs }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Slow Endpoints
      </h3>
      <div className="text-xs text-zinc-500">
        Endpoint analysis will appear here
      </div>
    </div>
  );
}

// src/components/workflow/components/PerformanceMetrics.tsx
export function PerformanceMetrics({ metrics }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Performance Metrics
      </h3>
      <div className="text-sm text-zinc-300">
        Avg: {metrics?.avgDuration || 0}ms
      </div>
    </div>
  );
}

// src/components/workflow/components/ConfidenceScore.tsx
export function ConfidenceScore({ logs }: any) {
  const aiLog = logs.find((l: any) => l.toolName === "AI Log Analyzer");
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Confidence Score
      </h3>
      <div className="text-2xl font-bold text-green-400">
        {aiLog?.output?.confidence || "N/A"}
      </div>
    </div>
  );
}

// src/components/workflow/components/RecommendedActions.tsx
export function RecommendedActions({ logs }: any) {
  const aiLog = logs.find((l: any) => l.toolName === "AI Log Analyzer");
  const recs = aiLog?.output?.recommendations || [];
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Recommended Actions
      </h3>
      {recs.length > 0 ? (
        <ul className="text-xs text-zinc-400 space-y-1">
          {recs.map((r: string, i: number) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-zinc-500">No recommendations yet</div>
      )}
    </div>
  );
}

// src/components/workflow/components/LogViewer.tsx
export function LogViewer({ logs }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">Log Viewer</h3>
      <div className="text-xs text-zinc-500 max-h-48 overflow-auto">
        {logs.slice(-10).map((log: any) => (
          <div key={log.id} className="py-1">
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// src/components/workflow/components/ErrorPatterns.tsx
export function ErrorPatterns({ logs }: any) {
  const errors = logs.filter((l: any) => l.level === "error");
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300">
        Error Patterns
      </h3>
      <div className="text-2xl font-bold text-red-400">{errors.length}</div>
      <div className="text-xs text-zinc-500">Total Errors</div>
    </div>
  );
}
