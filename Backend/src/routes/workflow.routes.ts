import express from "express";
import { Workflow } from "../models/workflow.model";
import { generateWorkflowFromPrompt } from "../engine/tools/aiWorkFlowGenerator";

const router = express.Router();

// AI: Generate workflow from prompt
router.post("/generate-workflow", async (req, res) => {
  try {
    const { prompt, context, nodeLibrary } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "prompt is required",
      });
    }

    console.log("🤖 Generating workflow from prompt:", prompt);

    const workflow = await generateWorkflowFromPrompt({
      prompt,
      context,
      nodeLibrary,
    });

    res.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error("Error generating workflow:", error);
    res.status(500).json({
      error: "Failed to generate workflow",
      message: error.message,
    });
  }
});

// Get all workflows for a workspace
router.get("/", async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const workflows = await Workflow.find({ workspaceId })
      .sort({ createdAt: -1 })
      .select("_id name description nodes edges createdAt updatedAt");

    res.json({
      success: true,
      workflows,
    });
  } catch (error: any) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({
      error: "Failed to fetch workflows",
      message: error.message,
    });
  }
});

// Get a single workflow by ID
router.get("/:id", async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({
      error: "Failed to fetch workflow",
      message: error.message,
    });
  }
});

// Create a new workflow
router.post("/", async (req, res) => {
  try {
    const { name, description, workspaceId, nodes, edges } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({
        error: "name and workspaceId are required",
      });
    }

    const workflow = new Workflow({
      name,
      description,
      workspaceId,
      nodes: nodes || [],
      edges: edges || [],
    });

    await workflow.save();

    res.status(201).json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error("Error creating workflow:", error);
    res.status(500).json({
      error: "Failed to create workflow",
      message: error.message,
    });
  }
});

// Update a workflow
router.put("/:id", async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;

    const workflow = await Workflow.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        nodes,
        edges,
      },
      { new: true, runValidators: true },
    );

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error("Error updating workflow:", error);
    res.status(500).json({
      error: "Failed to update workflow",
      message: error.message,
    });
  }
});

// Delete a workflow
router.delete("/:id", async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workflow:", error);
    res.status(500).json({
      error: "Failed to delete workflow",
      message: error.message,
    });
  }
});

export default router;
