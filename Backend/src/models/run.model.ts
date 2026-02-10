import mongoose, { Schema, Document } from "mongoose";

export type RunStatus = "running" | "success" | "failed" | "paused";

export interface IRunLog {
  nodeId: string;
  label: string;
  status: "success" | "failed";
  message: string;
  output?: any;
  error?: string;
  timestamp: Date;
  resultSuccess?: boolean;
}

export interface IRun extends Document {
  workflowId: mongoose.Types.ObjectId;
  status: RunStatus;
  logs: IRunLog[];
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  duration?: number;
  error?: string;
}

const RunLogSchema = new Schema(
  {
    nodeId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    output: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    resultSuccess: {
      type: Boolean,
    },
  },
  { _id: false },
);

const RunSchema = new Schema<IRun>(
  {
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["running", "success", "failed", "paused"],
      default: "running",
      index: true,
    },
    logs: {
      type: [RunLogSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
RunSchema.index({ workflowId: 1, startedAt: -1 });
RunSchema.index({ status: 1, startedAt: -1 });

export const Run = mongoose.model<IRun>("Run", RunSchema);
