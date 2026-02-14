/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

interface DockerStatus {
  connected: boolean;
  mode: "local" | "remote";
  host?: string;
  version?: string;
  containers?: number;
  error?: string;
  timestamp: string;
}

interface DockerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export default function DockerConnectionModal({
  isOpen,
  onClose,
  onConnected,
}: DockerConnectionModalProps) {
  const [mode, setMode] = useState<"local" | "remote">("local");
  const [host, setHost] = useState("");
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/docker/status?refresh=true`,
      );
      const data = await response.json();

      if (data.success && data.status) {
        setStatus(data.status);
        setMode(data.status.mode);
        if (data.status.host) {
          setHost(data.status.host.replace("tcp://", ""));
        }

        if (data.status.connected) {
          onConnected();
        }
      }
    } catch (err: any) {
      console.error("Failed to check Docker status:", err);
      setError("Failed to check Docker status");
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const payload: any = { mode };

      if (mode === "remote") {
        if (!host.trim()) {
          setError("Please enter a Docker host");
          setIsConnecting(false);
          return;
        }
        payload.host = host.startsWith("tcp://") ? host : `tcp://${host}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/docker/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (data.success && data.status.connected) {
        setStatus(data.status);
        onConnected();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.status.error || "Failed to connect to Docker");
        setStatus(data.status);
      }
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect to Docker");
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={status?.connected ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-[rgb(var(--background))] rounded-xl border border-[rgb(var(--border))] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-[rgb(var(--border))] surface-elevated px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20">
                <Server className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[rgb(var(--foreground))]">
                  Docker Connection
                </h2>
                <p className="text-xs text-[rgb(var(--foreground-muted))]">
                  Connect to Docker to use SRE features
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Status */}
            {status && (
              <div
                className={`rounded-lg border p-4 ${
                  status.connected
                    ? "border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/10"
                    : "border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {status.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-[rgb(var(--success))] flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-[rgb(var(--error))] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium mb-1 ${
                        status.connected
                          ? "text-[rgb(var(--success))]"
                          : "text-[rgb(var(--error))]"
                      }`}
                    >
                      {status.connected
                        ? "Docker Connected"
                        : "Docker Not Connected"}
                    </p>
                    {status.connected ? (
                      <div className="space-y-1 text-xs text-[rgb(var(--foreground-muted))]">
                        <div>Mode: {status.mode}</div>
                        <div>Version: {status.version}</div>
                        <div>Containers: {status.containers}</div>
                        {status.host && <div>Host: {status.host}</div>}
                      </div>
                    ) : (
                      <p className="text-xs text-[rgb(var(--foreground-muted))]">
                        {status.error}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={checkStatus}
                    className="p-1.5 rounded hover:surface"
                  >
                    <RefreshCw className="h-4 w-4 text-[rgb(var(--foreground-muted))]" />
                  </button>
                </div>
              </div>
            )}

            {!status?.connected && (
              <>
                {/* Connection Mode */}
                <div>
                  <label className="text-sm font-semibold text-[rgb(var(--foreground))] mb-3 block">
                    Connection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("local")}
                      disabled={isConnecting}
                      className={`p-4 rounded-lg border transition-all ${
                        mode === "local"
                          ? "border-[rgb(var(--primary))]/30 surface-elevated shadow-sm"
                          : "border-[rgb(var(--border))] surface hover:surface-elevated"
                      }`}
                    >
                      <Wifi
                        className={`h-5 w-5 mb-2 ${
                          mode === "local"
                            ? "text-[rgb(var(--primary))]"
                            : "text-[rgb(var(--foreground-muted))]"
                        }`}
                      />
                      <div
                        className={`text-sm font-medium ${
                          mode === "local"
                            ? "text-[rgb(var(--foreground))]"
                            : "text-[rgb(var(--foreground-muted))]"
                        }`}
                      >
                        Local
                      </div>
                      <div className="text-xs text-[rgb(var(--foreground-subtle))] mt-1">
                        Connect to local Docker
                      </div>
                    </button>

                    <button
                      onClick={() => setMode("remote")}
                      disabled={isConnecting}
                      className={`p-4 rounded-lg border transition-all ${
                        mode === "remote"
                          ? "border-[rgb(var(--primary))]/30 surface-elevated shadow-sm"
                          : "border-[rgb(var(--border))] surface hover:surface-elevated"
                      }`}
                    >
                      <Server
                        className={`h-5 w-5 mb-2 ${
                          mode === "remote"
                            ? "text-[rgb(var(--primary))]"
                            : "text-[rgb(var(--foreground-muted))]"
                        }`}
                      />
                      <div
                        className={`text-sm font-medium ${
                          mode === "remote"
                            ? "text-[rgb(var(--foreground))]"
                            : "text-[rgb(var(--foreground-muted))]"
                        }`}
                      >
                        Remote
                      </div>
                      <div className="text-xs text-[rgb(var(--foreground-subtle))] mt-1">
                        Connect to remote host
                      </div>
                    </button>
                  </div>
                </div>

                {/* Remote Host Input */}
                {mode === "remote" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <label className="text-sm font-semibold text-[rgb(var(--foreground))] mb-2 block">
                      Docker Host
                    </label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="192.168.1.100:2375"
                      disabled={isConnecting}
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgb(var(--border))] surface-elevated text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--foreground-subtle))] focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/20"
                    />
                    <p className="text-xs text-[rgb(var(--foreground-muted))] mt-2">
                      Enter host and port (e.g., 192.168.1.100:2375)
                    </p>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="rounded-lg border border-[rgb(var(--error))]/30 bg-[rgb(var(--error))]/10 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-[rgb(var(--error))] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[rgb(var(--error))] leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Info */}
                <div className="rounded-lg border border-[rgb(var(--border))] surface-elevated p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-[rgb(var(--primary))] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[rgb(var(--foreground-muted))] leading-relaxed">
                      {mode === "local"
                        ? "Make sure Docker is running on your local machine. Docker Desktop or Docker Engine must be installed and running."
                        : "For remote connections, ensure Docker's remote API is enabled on the target host."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[rgb(var(--border))] surface px-6 py-4 flex items-center justify-between">
            {status?.connected ? (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors"
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[rgb(var(--foreground-muted))] hover:surface transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || (mode === "remote" && !host.trim())}
                  className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
