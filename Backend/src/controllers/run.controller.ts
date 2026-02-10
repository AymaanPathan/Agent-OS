import { Request, Response } from "express";
import { Workflow } from "../models/workflow.model";
import { Run } from "../models/run.model";
import { sendApproval } from "../workflows/executeWorkflow";
import { io } from "../lib/socket";

import { executeWorkflow } from "../workflows/executeWorkflow";
import mongoose from "mongoose";

export const approveRun = async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const updated = sendApproval(runId, "approved");

    if (!updated) {
      return res.status(404).json({ error: "No paused run found" });
    }

    // Update DB status
    await Run.findByIdAndUpdate(runId, {
      status: "running",
      approvedAt: new Date(),
    });

    io.to(runId).emit("approval_result", {
      runId,
      decision: "approved",
    });

    return res.json({ success: true, runId, decision: "approved" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const rejectRun = async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const updated = sendApproval(runId, "rejected");

    if (!updated) {
      return res.status(404).json({ error: "No paused run found" });
    }

    // Update DB status
    await Run.findByIdAndUpdate(runId, {
      status: "failed",
      rejectedAt: new Date(),
    });

    io.to(runId).emit("approval_result", {
      runId,
      decision: "rejected",
    });

    return res.json({ success: true, runId, decision: "rejected" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const startRun = async (req: Request, res: Response) => {
  const { workflowId } = req.body;

  if (!workflowId) {
    return res.status(400).json({ error: "workflowId is required" });
  }
  
  if (!mongoose.Types.ObjectId.isValid(workflowId)) {
    return res.status(400).json({ error: "Invalid workflowId" });
  }

  const workflow = await Workflow.findById(workflowId);
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  const run = await Run.create({
    workflowId,
    status: "running",
    logs: [],
  });

  executeWorkflow(run._id.toString(), workflow.nodes, workflow.edges).catch(
    async (err) => {
      await Run.findByIdAndUpdate(run._id, {
        status: "failed",
        error: err.message,
      });
    },
  );

  res.json({
    runId: run._id,
    status: "running",
  });
};

export const getRunById = async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const run = await Run.findById(runId);

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    return res.json({
      runId: run._id,
      status: run.status,
      logs: run.logs || [],
      // createdAt: run.createdAt,
      // updatedAt: run.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
