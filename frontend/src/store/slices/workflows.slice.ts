/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { saveWorkflowApi } from "@/api/saveWorkflow.api";

export const saveWorkflow = createAsyncThunk(
  "workflows/save",
  async (
    payload: {
      name: string;
      nodes: any[];
      edges: any[];
      workspaceId: string;
    },
    { rejectWithValue },
  ) => {
    try {
      return await saveWorkflowApi(payload);
    } catch (err: any) {
      return rejectWithValue("Failed to save workflow");
    }
  },
);

type SavedWorkflow = {
  _id: string;
  name: string;
  nodes: any[];
  edges: any[];
};

type WorkflowsState = {
  items: SavedWorkflow[];
  current?: SavedWorkflow;
  loading: boolean;
  error?: string;
};

const initialState: WorkflowsState = {
  items: [],
  loading: false,
};

const workflowsSlice = createSlice({
  name: "workflows",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(saveWorkflow.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveWorkflow.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(saveWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default workflowsSlice.reducer;
