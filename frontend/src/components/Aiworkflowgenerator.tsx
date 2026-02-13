/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ExamplePrompt = {
  title: string;
  prompt: string;
};

type AIWorkflowGeneratorProps = {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated: (workflow: {
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
    reasoning: string;
  }) => void;
};

export default function AIWorkflowGenerator({
  isOpen,
  onClose,
  onWorkflowGenerated,
}: AIWorkflowGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<ExamplePrompt[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);

  // Handle example selection
  const selectExample = (example: ExamplePrompt) => {
    setPrompt(example.prompt);
    setContext("");
    setError(null);
  };

  // Generate workflow
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a workflow description");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Import node library and configs
      const { nodesLibrary } = await import("@/lib/nodesLibrary");
      const { nodeConfigs } = await import("@/lib/nodeConfigs");

      const res = await fetch(
        process.env.BACKEND_URL + "/api/workflows/generate-workflow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            context: context.trim() || undefined,
            nodeLibrary: {
              nodes: nodesLibrary,
              configs: nodeConfigs,
            },
          }),
        },
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate workflow");
      }

      console.log("✅ Workflow generated:", data.workflow);

      // Pass workflow to parent
      onWorkflowGenerated(data.workflow);

      // Reset and close
      setPrompt("");
      setContext("");
      onClose();
    } catch (err: any) {
      console.error("❌ Generation failed:", err);
      setError(err.message || "Failed to generate workflow");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-2.5 shadow-lg shadow-purple-900/30">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    AI Workflow Generator
                  </div>
                  <div className="text-sm text-zinc-400">
                    Describe your workflow in natural language
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  What workflow do you want to create?
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-900/30 transition"
                  rows={4}
                  placeholder="Example: Create a workflow that monitors Docker containers, checks their health, and automatically restarts unhealthy ones. Send a Slack notification when containers are restarted."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Context Input (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Additional Context{" "}
                  <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-900/30 transition"
                  rows={2}
                  placeholder="Any specific requirements, container names, endpoints, or configurations..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              {/* Example Prompts */}
              {examples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Example Prompts
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {examples.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => selectExample(example)}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left transition hover:border-purple-600 hover:bg-zinc-800"
                      >
                        <div className="text-sm font-medium text-zinc-200">
                          {example.title}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-zinc-500">
                          {example.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingExamples && (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mx-auto" />
                  <div className="text-xs text-zinc-500 mt-2">
                    Loading examples...
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-200">
                      Generation Failed
                    </div>
                    <div className="mt-1 text-sm text-red-300">{error}</div>
                  </div>
                </motion.div>
              )}

              {/* Info */}
              <div className="flex items-start gap-3 rounded-lg border border-blue-900/50 bg-blue-950/30 p-4">
                <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  The AI will analyze your description and automatically create
                  a workflow with the appropriate nodes, connections, and
                  configurations.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.08] px-6 py-4">
              <div className="text-xs text-zinc-500">
                Powered by Groq Llama 3.3 70B
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="rounded-lg border-white/[0.12] bg-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Workflow
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
