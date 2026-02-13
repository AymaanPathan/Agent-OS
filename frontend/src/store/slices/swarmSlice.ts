/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SwarmConfig {
  goal: string;
  enabledAgents: string[];
  safetyOptions: Record<string, boolean>;
}

export interface SwarmExecution {
  id: string;
  config: SwarmConfig;
  status: "running" | "success" | "error";
  startTime: string;
  endTime?: string;
  messages: any[];
}

interface SwarmState {
  currentConfig: SwarmConfig;
  executions: Record<string, SwarmExecution>;
  activeExecutionId: string | null;
}

const initialState: SwarmState = {
  currentConfig: {
    goal: "",
    enabledAgents: [
      "incident-commander",
      "log-detective",
      "recovery-strategist",
      "risk-checker",
    ],
    safetyOptions: {
      require_approval: true,
      auto_rollback: true,
      notification: false,
    },
  },
  executions: {},
  activeExecutionId: null,
};

const swarmSlice = createSlice({
  name: "swarm",
  initialState,
  reducers: {
    updateSwarmConfig: (state, action: PayloadAction<Partial<SwarmConfig>>) => {
      state.currentConfig = { ...state.currentConfig, ...action.payload };
    },

    startExecution: (
      state,
      action: PayloadAction<{ id: string; config: SwarmConfig }>,
    ) => {
      const { id, config } = action.payload;
      state.executions[id] = {
        id,
        config,
        status: "running",
        startTime: new Date().toISOString(),
        messages: [],
      };
      state.activeExecutionId = id;
    },

    updateExecution: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<SwarmExecution> }>,
    ) => {
      const { id, updates } = action.payload;
      if (state.executions[id]) {
        state.executions[id] = { ...state.executions[id], ...updates };
      }
    },

    addExecutionMessage: (
      state,
      action: PayloadAction<{ id: string; message: any }>,
    ) => {
      const { id, message } = action.payload;
      if (state.executions[id]) {
        state.executions[id].messages.push(message);
      }
    },

    completeExecution: (
      state,
      action: PayloadAction<{ id: string; status: "success" | "error" }>,
    ) => {
      const { id, status } = action.payload;
      if (state.executions[id]) {
        state.executions[id].status = status;
        state.executions[id].endTime = new Date().toISOString();
      }
      if (state.activeExecutionId === id) {
        state.activeExecutionId = null;
      }
    },

    clearExecutions: (state) => {
      state.executions = {};
      state.activeExecutionId = null;
    },
  },
});

export const {
  updateSwarmConfig,
  startExecution,
  updateExecution,
  addExecutionMessage,
  completeExecution,
  clearExecutions,
} = swarmSlice.actions;

export default swarmSlice.reducer;
