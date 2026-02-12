/* eslint-disable @typescript-eslint/no-explicit-any */
// SwarmVisualization.tsx (new component)
import { motion } from "framer-motion";
import { Activity, CheckCircle, Clock, AlertCircle } from "lucide-react";

// Mock data structure for swarm execution logs
const mockSwarmExecutionLog = {
  nodeId: "swarm-incident-123",
  nodeType: "swarm.incidentCommander",
  startTime: "2025-02-13T10:30:00Z",
  status: "running",

  // ✨ Swarm-specific data
  swarmData: {
    masterAgent: {
      status: "coordinating",
      currentPhase: "analysis",
      decision: null,
    },

    activeSubAgents: [
      {
        agentId: "healthScout-1",
        agentType: "agent.healthScout",
        status: "completed",
        startedAt: "2025-02-13T10:30:01Z",
        completedAt: "2025-02-13T10:30:05Z",
        output: {
          unhealthyContainers: ["api-server"],
          healthyCount: 3,
          unhealthyCount: 1,
        },
        confidence: 1.0,
      },
      {
        agentId: "logDetective-1",
        agentType: "agent.logDetective",
        status: "running",
        startedAt: "2025-02-13T10:30:06Z",
        progress: 65,
        currentAction: "Analyzing error patterns...",
      },
      {
        agentId: "recoveryStrategist-1",
        agentType: "agent.recoveryStrategist",
        status: "waiting",
        waitingFor: "logDetective-1",
      },
    ],

    timeline: [
      {
        timestamp: "2025-02-13T10:30:00Z",
        event: "Swarm activated",
        actor: "master",
      },
      {
        timestamp: "2025-02-13T10:30:01Z",
        event: "Spawned Health Scout",
        actor: "master",
        details: "Scanning all running containers",
      },
      {
        timestamp: "2025-02-13T10:30:05Z",
        event: "Health Scout completed",
        actor: "healthScout-1",
        details: "Found 1 unhealthy container: api-server",
      },
      {
        timestamp: "2025-02-13T10:30:06Z",
        event: "Spawned Log Detective",
        actor: "master",
        details: "Analyzing logs from api-server",
      },
    ],
  },
};

function SwarmVisualization({ swarmData }: any) {
  return (
    <div className="space-y-4">
      {/* Master Agent */}
      <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-500/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-blue-900 dark:text-blue-100">
              Master Coordinator
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300">
              Phase: {swarmData.masterAgent.currentPhase}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Agents */}
      <div className="pl-8 space-y-2 border-l-2 border-blue-300">
        {swarmData.activeSubAgents.map((agent: any) => (
          <motion.div
            key={agent.agentId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border ${
              agent.status === "completed"
                ? "border-green-500 bg-green-50 dark:bg-green-500/10"
                : agent.status === "running"
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                  : "border-gray-300 bg-gray-50 dark:bg-gray-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {agent.status === "completed" && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {agent.status === "running" && (
                  <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
                )}
                {agent.status === "waiting" && (
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {agent.agentType.split(".")[1]}
                </span>
              </div>

              {agent.status === "running" && (
                <div className="text-xs text-gray-600">{agent.progress}%</div>
              )}
            </div>

            {agent.currentAction && (
              <div className="mt-2 text-xs text-gray-600">
                {agent.currentAction}
              </div>
            )}

            {agent.output && (
              <div className="mt-2 text-xs">
                <span className="font-medium">Output:</span>{" "}
                {JSON.stringify(agent.output).slice(0, 80)}...
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
