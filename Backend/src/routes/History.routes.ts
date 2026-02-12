import express from "express";
import { Workflow } from "../models/workflow.model";
import { Run } from "../models/run.model";

const router = express.Router();

// Get all workflows for a workspace with run statistics
router.get("/workflows/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Get workflows
    const workflows = await Workflow.find({ workspaceId })
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    // Get run statistics for each workflow
    const workflowsWithStats = await Promise.all(
      workflows.map(async (workflow) => {
        const runs = await Run.find({ workflowId: workflow._id })
          .sort({ startedAt: -1 })
          .lean();

        const stats = {
          totalRuns: runs.length,
          successfulRuns: runs.filter((r) => r.status === "success").length,
          failedRuns: runs.filter((r) => r.status === "failed").length,
          lastRun: runs[0]
            ? {
                _id: runs[0]._id,
                status: runs[0].status,
                startedAt: runs[0].startedAt,
                completedAt: runs[0].completedAt,
                duration: runs[0].duration,
              }
            : null,
        };

        return {
          ...workflow,
          stats,
        };
      }),
    );

    const total = await Workflow.countDocuments({ workspaceId });

    res.json({
      success: true,
      workflows: workflowsWithStats,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: Number(skip) + Number(limit) < total,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching workflow history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch workflow history",
    });
  }
});

// Get detailed workflow information
router.get("/workflow/:workflowId", async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = await Workflow.findById(workflowId).lean();

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: "Workflow not found",
      });
    }

    // Get all runs for this workflow
    const runs = await Run.find({ workflowId })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      workflow: {
        ...workflow,
        recentRuns: runs,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching workflow details:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch workflow details",
    });
  }
});

// Get run details
router.get("/run/:runId", async (req, res) => {
  try {
    const { runId } = req.params;

    const run = await Run.findById(runId).populate("workflowId").lean();

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Run not found",
      });
    }

    res.json({
      success: true,
      run,
    });
  } catch (error: any) {
    console.error("❌ Error fetching run details:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch run details",
    });
  }
});

// Delete workflow
router.delete("/workflow/:workflowId", async (req, res) => {
  try {
    const { workflowId } = req.params;

    // Delete workflow
    await Workflow.findByIdAndDelete(workflowId);

    // Delete associated runs
    await Run.deleteMany({ workflowId });

    res.json({
      success: true,
      message: "Workflow and associated runs deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting workflow:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete workflow",
    });
  }
});

// Get workspace statistics
router.get("/stats/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const totalWorkflows = await Workflow.countDocuments({ workspaceId });
    const allRuns = await Run.find({}).populate("workflowId").lean();

    // Filter runs by workspaceId
    const workspaceRuns = allRuns.filter(
      (run: any) => run.workflowId?.workspaceId === workspaceId,
    );

    const stats = {
      totalWorkflows,
      totalRuns: workspaceRuns.length,
      successfulRuns: workspaceRuns.filter((r) => r.status === "success")
        .length,
      failedRuns: workspaceRuns.filter((r) => r.status === "failed").length,
      runningRuns: workspaceRuns.filter((r) => r.status === "running").length,
      averageDuration:
        workspaceRuns.filter((r) => r.duration).length > 0
          ? workspaceRuns.reduce((sum, r) => sum + (r.duration || 0), 0) /
            workspaceRuns.filter((r) => r.duration).length
          : 0,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("❌ Error fetching workspace stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch workspace statistics",
    });
  }
});

export default router;
