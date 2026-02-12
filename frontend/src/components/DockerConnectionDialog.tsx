"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Link } from "lucide-react";

export function DockerConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dockerHost, setDockerHost] = useState("");
  const [dockerPort, setDockerPort] = useState("2375");
  const [connecting, setConnecting] = useState(false);

  const testConnection = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/docker/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: dockerHost, port: dockerPort }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("docker_host", dockerHost);
        localStorage.setItem("docker_port", dockerPort);
        alert("✅ Connected to Docker successfully!");
        onOpenChange(false);
      } else {
        alert("❌ Connection failed: " + result.error);
      }
    } catch (error) {
      alert("❌ Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connect Your Docker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Docker Host
            </label>
            <Input
              placeholder="tcp://your-server.com"
              value={dockerHost}
              onChange={(e) => setDockerHost(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Docker Port
            </label>
            <Input
              placeholder="2375"
              value={dockerPort}
              onChange={(e) => setDockerPort(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>Setup Guide:</strong>
              <br />
              1. Enable Docker Remote API on your server
              <br />
              2. Configure TLS for security (recommended)
              <br />
              3. Expose port 2375 (or 2376 for TLS)
              <br />
              4. Whitelist this app&apos;s IP in firewall
            </p>
          </div>

          <Button
            onClick={testConnection}
            disabled={connecting || !dockerHost}
            className="w-full"
          >
            <Link className="mr-2 h-4 w-4" />
            {connecting ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
