  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
  import { startRunApi } from "@/api/startRun.api";

  export const startRun = createAsyncThunk(
    "runs/start",
    async (
      payload: {
        workflowId: string;
      },
      { rejectWithValue },
    ) => {
      try {
        return await startRunApi(payload);
      } catch (err: any) {
        return rejectWithValue("Failed to start run");
      }
    },
  );

  type RunState = {
    runId?: string;
    status?: "running" | "success" | "failed";
    loading: boolean;
    error?: string;
  };

  const initialState: RunState = {
    loading: false,
  };

  const runsSlice = createSlice({
    name: "runs",
    initialState,
    reducers: {
      resetRun(state) {
        state.runId = undefined;
        state.status = undefined;
        state.error = undefined;
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(startRun.pending, (state) => {
          state.loading = true;
          state.error = undefined;
        })
        .addCase(startRun.fulfilled, (state, action) => {
          state.loading = false;
          state.runId = action.payload.runId;
          state.status = action.payload.status;
        })
        .addCase(startRun.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        });
    },
  });

  export const { resetRun } = runsSlice.actions;
  export default runsSlice.reducer;
