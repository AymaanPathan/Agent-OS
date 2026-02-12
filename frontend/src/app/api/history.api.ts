/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function getWorkflowHistory(
  workspaceId: string,
  limit = 50,
  skip = 0,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/history/workflows/${workspaceId}?limit=${limit}&skip=${skip}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch workflow history");
  }

  return response.json();
}

export async function getWorkflowDetails(workflowId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/history/workflow/${workflowId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch workflow details");
  }

  return response.json();
}

export async function getRunDetails(runId: string) {
  const response = await fetch(`${API_BASE_URL}/api/history/run/${runId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch run details");
  }

  return response.json();
}

export async function deleteWorkflow(workflowId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/history/workflow/${workflowId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete workflow");
  }

  return response.json();
}

export async function getWorkspaceStats(workspaceId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/history/stats/${workspaceId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch workspace statistics");
  }

  return response.json();
}
