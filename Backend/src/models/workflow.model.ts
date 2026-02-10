import mongoose, { Schema, Document } from "mongoose";

export interface IWorkflow extends Document {
  name: string;
  description?: string;
  workspaceId: string;
  nodes: any[];
  edges: any[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    nodes: {
      type: Schema.Types.Mixed,
      required: true,
      default: [],
    },
    edges: {
      type: Schema.Types.Mixed,
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
WorkflowSchema.index({ workspaceId: 1, createdAt: -1 });
WorkflowSchema.index({ name: 1 });

export const Workflow = mongoose.model<IWorkflow>("Workflow", WorkflowSchema);
