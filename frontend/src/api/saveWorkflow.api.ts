/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "@/lib/axios";

export type SaveWorkflowPayload = {
  name: string;
  nodes: any[];
  edges: any[];
  workspaceId: string;
};

export const saveWorkflowApi = async (payload: SaveWorkflowPayload) => {
  const res = await api.post("/workflows", payload);
  return res.data;
};
