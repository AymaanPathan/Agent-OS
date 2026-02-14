"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useDockerConnection } from "@/hooks/useDockerConnection";

interface DockerStatusIndicatorProps {
  onOpenSettings?: () => void;
}

export default function DockerStatusIndicator({
  onOpenSettings,
}: DockerStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Load saved state from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dockerStatusExpanded");
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { status, isLoading, isConnected, checkStatus } = useDockerConnection();

  // Save expanded state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dockerStatusExpanded", JSON.stringify(isExpanded));
    }
  }, [isExpanded]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="rounded-lg border border-[rgb(var(--border))] surface-elevated shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Header - Always Visible */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--border))] cursor-pointer hover:surface transition-colors ${
            isConnected
              ? "bg-[rgb(var(--success))]/5"
              : "bg-[rgb(var(--error))]/5"
          }`}
          onClick={toggleExpanded}
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--foreground-muted))]" />
            ) : isConnected ? (
              <div className="h-2 w-2 rounded-full bg-[rgb(var(--success))] animate-pulse" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-[rgb(var(--error))]" />
            )}
            <Server className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
            <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
              Docker Status
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={isRefreshing}
              className="p-1 rounded hover:surface transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[rgb(var(--foreground-muted))] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
            <button className="p-1 rounded hover:surface transition-colors">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-[rgb(var(--foreground-muted))]" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-[rgb(var(--foreground-muted))]" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-3 min-w-[280px]">
                {/* Connection Status */}
                <div
                  className={`rounded-lg border p-3 ${
                    isConnected
                      ? "border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/10"
                      : "border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isConnected ? (
                      <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[rgb(var(--error))]" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        isConnected
                          ? "text-[rgb(var(--success))]"
                          : "text-[rgb(var(--error))]"
                      }`}
                    >
                      {isConnected ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  {isConnected && status ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[rgb(var(--foreground-subtle))]">
                          Mode:
                        </span>
                        <span className="text-[rgb(var(--foreground))] font-medium">
                          {status.mode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[rgb(var(--foreground-subtle))]">
                          Version:
                        </span>
                        <span className="text-[rgb(var(--foreground))] font-medium">
                          {status.version}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[rgb(var(--foreground-subtle))]">
                          Containers:
                        </span>
                        <span className="text-[rgb(var(--foreground))] font-medium">
                          {status.containers}
                        </span>
                      </div>
                      {status.host && (
                        <div className="flex items-center justify-between">
                          <span className="text-[rgb(var(--foreground-subtle))]">
                            Host:
                          </span>
                          <span className="text-[rgb(var(--foreground))] font-medium text-[10px]">
                            {status.host}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[rgb(var(--foreground-muted))]">
                      {status?.error ||
                        "Please connect to Docker to use SRE features"}
                    </p>
                  )}
                </div>

                {/* Last Updated */}
                {status?.timestamp && (
                  <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--foreground-subtle))]">
                    <Info className="h-3 w-3" />
                    <span>
                      Last checked:{" "}
                      {new Date(status.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isConnected && (
                    <button
                      onClick={onOpenSettings}
                      className="flex-1 px-3 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-xs font-medium transition-colors"
                    >
                      Connect
                    </button>
                  )}
                  {isConnected && (
                    <button
                      onClick={onOpenSettings}
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] hover:surface text-[rgb(var(--foreground))] text-xs font-medium transition-colors"
                    >
                      Settings
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
