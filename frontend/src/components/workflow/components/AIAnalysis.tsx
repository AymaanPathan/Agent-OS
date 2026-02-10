/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/workflow/components/AIAnalysis.tsx
import { Database, CheckCircle2 } from "lucide-react";

export function AIAnalysis({ logs }: any) {
  const aiLog = logs.find((l: any) => l.toolName === "AI Log Analyzer");

  if (!aiLog?.output) {
    return null;
  }

  const { summary, rootCause, confidence, errorCategory, recommendations } =
    aiLog.output;

  const confidenceColor =
    confidence === "high"
      ? "text-green-400"
      : confidence === "medium"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300 flex items-center gap-2">
        <Database className="h-4 w-4 text-purple-400" />
        AI Analysis
      </h3>

      <div className="space-y-4">
        {summary && (
          <div>
            <div className="text-xs text-zinc-500 mb-1">Summary</div>
            <div className="text-sm text-zinc-200">{summary}</div>
          </div>
        )}

        {rootCause && (
          <div>
            <div className="text-xs text-zinc-500 mb-1">Root Cause</div>
            <div className="text-sm text-zinc-200 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              {rootCause}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {confidence && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Confidence</div>
              <div className={`text-sm font-medium ${confidenceColor}`}>
                {confidence.toUpperCase()}
              </div>
            </div>
          )}

          {errorCategory && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Category</div>
              <div className="text-sm text-zinc-300">{errorCategory}</div>
            </div>
          )}
        </div>

        {recommendations && recommendations.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 mb-2">Recommendations</div>
            <div className="space-y-2">
              {recommendations.map((rec: string, idx: number) => (
                <div
                  key={idx}
                  className="text-xs text-zinc-300 bg-green-500/10 border border-green-500/20 p-2 rounded flex items-start gap-2"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
