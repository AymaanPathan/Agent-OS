/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Handle, Position } from "reactflow";
import {
  Activity,
  CheckCircle2,
  Zap,
  Wrench,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

const categoryIcons: Record<string, any> = {
  Triggers: Zap,
  Tools: Wrench,
  "Logic & Safety": ShieldCheck,
  Agents: Activity,
};

const categoryColors: Record<string, string> = {
  Triggers: "bg-blue-50 text-blue-700 border-blue-200",
  Tools: "bg-green-50 text-green-700 border-green-200",
  "Logic & Safety": "bg-orange-50 text-orange-700 border-orange-200",
  Agents: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function BaseNode({ data, id }: any) {
  const Icon = categoryIcons[data?.category] || Activity;
  const colorClass =
    categoryColors[data?.category] ||
    "bg-zinc-50 text-zinc-700 border-zinc-200";

  const nodeType = data?.nodeType;
  const isIfElse = nodeType === "logic.ifelse";

  // Get the node ID from React Flow's internals
  const nodeId = (data as any)?.__rf?.id || data?.id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onDelete && nodeId) {
      data.onDelete(nodeId);
    }
  };

  return (
    <div className="relative w-[260px] rounded-2xl border-2 border-zinc-200 bg-white shadow-md transition-shadow hover:shadow-lg group">
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 12,
          height: 12,
          background: "#111827",
          border: "3px solid white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />

      {/* Header */}
      <div
        className={`rounded-t-xl border-b border-zinc-100 px-4 py-2 ${colorClass}`}
      >
        <motion.button
          onClick={(e) => {
            e.stopPropagation();

            if (data?.onDelete && id) {
              data.onDelete(id);
            }
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute -top-2 -right-2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center border-2 border-white"
          title="Delete node"
        >
          <X className="h-3.5 w-3.5" />
        </motion.button>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-semibold">
            {data?.category || "Node"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">
          {data?.label || "Unnamed Node"}
        </div>
        <div className="mt-1 text-xs text-zinc-500 line-clamp-2">
          {data?.desc || "No description"}
        </div>

        {/* Config indicator */}
        {data?.config && Object.keys(data.config).length > 0 && (
          <div className="mt-2 border-t border-zinc-100 pt-2">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Configured</span>
            </div>
          </div>
        )}
      </div>

      {/* OUTPUT HANDLES */}
      {!isIfElse ? (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: 12,
            height: 12,
            background: "#111827",
            border: "3px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        />
      ) : (
        <>
          {/* TRUE branch */}
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            style={{
              left: "30%",
              width: 12,
              height: 12,
              background: "#16a34a",
              border: "3px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <div className="absolute bottom-[-18px] left-[22%] text-[10px] font-semibold text-green-600">
            TRUE
          </div>

          {/* FALSE branch */}
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            style={{
              left: "70%",
              width: 12,
              height: 12,
              background: "#dc2626",
              border: "3px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <div className="absolute bottom-[-18px] left-[62%] text-[10px] font-semibold text-red-600">
            FALSE
          </div>
        </>
      )}
    </div>
  );
}
