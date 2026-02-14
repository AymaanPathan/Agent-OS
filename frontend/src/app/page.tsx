"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  Zap,
  Brain,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Terminal,
  GitBranch,
  PlayCircle,
  Code2,
  Cpu,
  Container,
  Workflow,
  Bot,
  LineChart,
  Lock,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[rgb(var(--background))]"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary-rgb),0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-10" />
        </div>

        <motion.div style={{ y, opacity }} className="relative">
          {/* Navigation */}
          <nav className="border-b border-[rgb(var(--border))]/50 backdrop-blur-xl bg-[rgb(var(--background))]/80">
            <div className="max-w-7xl mx-auto px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))] flex items-center justify-center shadow-lg shadow-[rgb(var(--primary))]/20">
                    <Activity className="h-5 w-5 text-[rgb(var(--primary-foreground))]" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-[rgb(var(--foreground))] to-[rgb(var(--foreground-muted))] bg-clip-text text-transparent">
                    AgentOS
                  </span>
                </div>
              </div>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="max-w-7xl mx-auto px-6 pt-32 pb-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-6xl lg:text-7xl font-bold text-[rgb(var(--foreground))] mb-6 leading-[1.1] tracking-tight">
                  Build{" "}
                  <span className="bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))] bg-clip-text text-transparent">
                    Self-Healing
                  </span>{" "}
                  Infrastructure
                </h1>

                <p className="text-xl text-[rgb(var(--foreground-muted))] mb-10 leading-relaxed max-w-xl">
                  Visual workflow automation meets AI-powered monitoring. Build
                  resilient systems that detect, diagnose, and fix issues
                  automatically.
                </p>

                <div className="flex items-center gap-4 mb-12">
                  <Link
                    href="/builder"
                    className="group px-8 py-4 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-semibold transition-all flex items-center gap-3 shadow-xl shadow-[rgb(var(--primary))]/30 hover:shadow-2xl hover:shadow-[rgb(var(--primary))]/50 hover:scale-105"
                  >
                    Start Building
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="flex items-center gap-10">
                  <div className="h-14 w-px bg-gradient-to-b from-transparent via-[rgb(var(--border))] to-transparent" />
                  <div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-[rgb(var(--foreground))] to-[rgb(var(--foreground-muted))] bg-clip-text text-transparent">
                      99.9%
                    </div>
                    <div className="text-sm text-[rgb(var(--foreground-muted))] mt-1">
                      System Uptime
                    </div>
                  </div>
                  <div className="h-14 w-px bg-gradient-to-b from-transparent via-[rgb(var(--border))] to-transparent" />
                  <div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-[rgb(var(--foreground))] to-[rgb(var(--foreground-muted))] bg-clip-text text-transparent">
                      24/7
                    </div>
                    <div className="text-sm text-[rgb(var(--foreground-muted))] mt-1">
                      Auto-Healing
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative"
              >
                {/* Main Card */}
                <div className="rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface-elevated))] to-[rgb(var(--surface))] p-8 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--error))]" />
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--warning))]" />
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--success))]" />
                    </div>
                    <div className="ml-auto text-xs font-mono text-[rgb(var(--foreground-muted))]">
                      workflow.run
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        icon: Gauge,
                        label: "Health Check",
                        status: "success",
                        time: "2.3s",
                      },
                      {
                        icon: Brain,
                        label: "AI Analysis",
                        status: "running",
                        time: "Running...",
                      },
                      {
                        icon: Zap,
                        label: "Auto-Recovery",
                        status: "pending",
                        time: "Queued",
                      },
                      {
                        icon: CheckCircle2,
                        label: "Verification",
                        status: "pending",
                        time: "Pending",
                      },
                    ].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.15 }}
                        className="group flex items-center gap-4 p-4 rounded-2xl surface border border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/30 transition-all"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))]/20 to-[rgb(var(--primary))]/5 flex items-center justify-center group-hover:from-[rgb(var(--primary))]/30 group-hover:to-[rgb(var(--primary))]/10 transition-all">
                          <step.icon className="h-5 w-5 text-[rgb(var(--primary))]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[rgb(var(--foreground))] mb-0.5">
                            {step.label}
                          </div>
                          <div className="text-xs text-[rgb(var(--foreground-muted))] font-mono">
                            {step.time}
                          </div>
                        </div>
                        {step.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-[rgb(var(--success))]" />
                        )}
                        {step.status === "running" && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <div className="w-5 h-5 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full" />
                          </motion.div>
                        )}
                        {step.status === "pending" && (
                          <div className="w-5 h-5 border-2 border-[rgb(var(--border))] rounded-full" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Bento Grid */}
      <div className="py-32 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.05),transparent_70%)]" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-[rgb(var(--foreground))] mb-6">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))] bg-clip-text text-transparent">
                automate operations
              </span>
            </h2>
            <p className="text-xl text-[rgb(var(--foreground-muted))] max-w-3xl mx-auto">
              Build resilient systems with visual workflows, AI-powered
              monitoring, and intelligent auto-recovery
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Workflow,
                title: "Visual Workflow Builder",
                description:
                  "Drag-and-drop interface to create complex automation workflows without writing code",
                border: "border-blue-500/20",
                iconColor: "text-blue-500",
              },
              {
                icon: Brain,
                title: "AI-Powered Analysis",
                description:
                  "Automatically diagnose issues and suggest fixes using advanced AI log analysis",
                border: "border-purple-500/20",
                iconColor: "text-purple-500",
              },
              {
                icon: Zap,
                title: "Auto-Recovery",
                description:
                  "Self-healing infrastructure that detects and fixes issues before they impact users",
                border: "border-amber-500/20",
                iconColor: "text-amber-500",
              },

              {
                icon: LineChart,
                title: "Real-time Monitoring",
                description:
                  "Monitor containers, APIs, and services with customizable health checks and alerts",
                border: "border-rose-500/20",
                iconColor: "text-rose-500",
              },

              {
                icon: Bot,
                title: "Agent Orchestration",
                description:
                  "Coordinate multiple AI agents to investigate and resolve complex incidents",
                border: "border-cyan-500/20",
                iconColor: "text-cyan-500",
              },
              {
                icon: Terminal,
                title: "MCP Tool Integration",
                description:
                  "Execute deterministic operations with Model Context Protocol tool support",
                border: "border-fuchsia-500/20",
                iconColor: "text-fuchsia-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`group rounded-2xl border ${feature.border} bg-gradient-to-br  backdrop-blur-sm p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br  flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-[rgb(var(--foreground))] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[rgb(var(--foreground-muted))] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
