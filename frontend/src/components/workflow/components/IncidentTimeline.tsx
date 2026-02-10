/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function IncidentTimeline({ logs, metrics }: any) {
  const incidents = logs.filter(
    (l: any) =>
      l.level === "error" ||
      l.message.toLowerCase().includes("fail") ||
      l.message.toLowerCase().includes("crash"),
  );

  if (incidents.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-green-400" />
          Incident Timeline
        </h3>
        <div className="text-center py-8 text-zinc-500">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-xs">No incidents detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-zinc-300 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        Incident Timeline
        <span className="ml-auto text-xs text-zinc-500">
          {incidents.length} events
        </span>
      </h3>

      <div className="space-y-3 max-h-80 overflow-auto">
        {incidents.map((incident: any, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
              {idx < incidents.length - 1 && (
                <div className="w-0.5 h-full bg-red-400/30 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="text-sm text-red-400 font-medium">
                {incident.message}
              </div>
              <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {new Date(incident.timestamp).toLocaleString()}
              </div>
              {incident.data?.error && (
                <div className="mt-2 text-xs text-zinc-400 bg-zinc-800/50 p-2 rounded">
                  {incident.data.error}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {metrics?.downtime > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-zinc-500">Total Downtime</div>
            <div className="text-lg font-bold text-red-400">
              {(metrics.downtime / 1000).toFixed(2)}s
            </div>
          </div>
          {metrics.recoveryTime > 0 && (
            <div>
              <div className="text-xs text-zinc-500">Recovery Time</div>
              <div className="text-lg font-bold text-green-400">
                {(metrics.recoveryTime / 1000).toFixed(2)}s
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
