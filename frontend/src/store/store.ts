import { configureStore } from "@reduxjs/toolkit";
import workflowReducer from "./slices/workflows.slice";
import runsReducer from "./slices/runsSlice";

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    runs: runsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
