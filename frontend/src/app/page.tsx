"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />

        <div className="relative">
          {/* Navigation */}
          <nav className="border-b border-[rgb(var(--border))] surface-elevated">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[rgb(var(--primary))] flex items-center justify-center">
                    <Activity className="h-5 w-5 text-[rgb(var(--primary-foreground))]" />
                  </div>
                  <span className="text-xl font-bold text-[rgb(var(--foreground))]">
                    AgentOS
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href="/builder"
                    className="text-sm text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))] transition-colors"
                  >
                    Documentation
                  </Link>
                  <Link
                    href="/builder"
                    className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] text-sm font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-elevated border border-[rgb(var(--border))] mb-6">
                  <Sparkles className="h-3 w-3 text-[rgb(var(--primary))]" />
                  <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                    AI-Powered Workflow Automation
                  </span>
                </div>

                <h1 className="text-5xl font-bold text-[rgb(var(--foreground))] mb-6 leading-tight">
                  Build Self-Healing Infrastructure{" "}
                  <span className="text-[rgb(var(--primary))]">
                    Without Code
                  </span>
                </h1>

                <p className="text-lg text-[rgb(var(--foreground-muted))] mb-8 leading-relaxed">
                  AgentOS lets you create powerful automation workflows with
                  visual builders, AI-powered monitoring, and auto-recovery—no
                  DevOps expertise required.
                </p>

                <div className="flex items-center gap-4">
                  <Link
                    href="/builder"
                    className="group px-6 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-all flex items-center gap-2 shadow-lg shadow-[rgb(var(--primary))]/20 hover:shadow-xl hover:shadow-[rgb(var(--primary))]/30"
                  >
                    Start Building
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/builder"
                    className="px-6 py-3 rounded-lg border border-[rgb(var(--border))] surface-elevated hover:surface text-[rgb(var(--foreground))] font-medium transition-colors flex items-center gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    View Demo
                  </Link>
                </div>

                <div className="flex items-center gap-8 mt-12">
                  <div>
                    <div className="text-3xl font-bold text-[rgb(var(--foreground))]">
                      10k+
                    </div>
                    <div className="text-sm text-[rgb(var(--foreground-muted))]">
                      Workflows Created
                    </div>
                  </div>
                  <div className="h-12 w-px bg-[rgb(var(--border))]" />
                  <div>
                    <div className="text-3xl font-bold text-[rgb(var(--foreground))]">
                      99.9%
                    </div>
                    <div className="text-sm text-[rgb(var(--foreground-muted))]">
                      Uptime
                    </div>
                  </div>
                  <div className="h-12 w-px bg-[rgb(var(--border))]" />
                  <div>
                    <div className="text-3xl font-bold text-[rgb(var(--foreground))]">
                      24/7
                    </div>
                    <div className="text-sm text-[rgb(var(--foreground-muted))]">
                      Auto-Healing
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="rounded-2xl border border-[rgb(var(--border))] surface-elevated p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--error))]" />
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--warning))]" />
                      <div className="w-3 h-3 rounded-full bg-[rgb(var(--success))]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: Terminal,
                        label: "Check Health",
                        status: "success",
                      },
                      {
                        icon: Brain,
                        label: "AI Analysis",
                        status: "running",
                      },
                      { icon: Zap, label: "Auto-Fix", status: "pending" },
                    ].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-lg surface border border-[rgb(var(--border))]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[rgb(var(--primary))]/10 flex items-center justify-center">
                          <step.icon className="h-4 w-4 text-[rgb(var(--primary))]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[rgb(var(--foreground))]">
                            {step.label}
                          </div>
                        </div>
                        {step.status === "success" && (
                          <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />
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
                            <div className="w-4 h-4 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 w-32 h-32 rounded-xl bg-[rgb(var(--success))]/10 border border-[rgb(var(--success))]/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[rgb(var(--success))]">
                      100%
                    </div>
                    <div className="text-xs text-[rgb(var(--foreground-muted))]">
                      Automated
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  className="absolute -bottom-4 -left-4 w-28 h-28 rounded-xl bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <Zap className="h-8 w-8 text-[rgb(var(--primary))]" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[rgb(var(--foreground))] mb-4">
              Everything you need for{" "}
              <span className="text-[rgb(var(--primary))]">
                intelligent automation
              </span>
            </h2>
            <p className="text-lg text-[rgb(var(--foreground-muted))] max-w-2xl mx-auto">
              Build, monitor, and heal your infrastructure with AI-powered
              workflows
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: GitBranch,
                title: "Visual Workflow Builder",
                description:
                  "Drag-and-drop interface to create complex automation workflows without writing code",
                color: "primary",
              },
              {
                icon: Brain,
                title: "AI-Powered Analysis",
                description:
                  "Automatically diagnose issues and suggest fixes using advanced AI log analysis",
                color: "primary",
              },
              {
                icon: Zap,
                title: "Auto-Recovery",
                description:
                  "Self-healing infrastructure that detects and fixes issues before they impact users",
                color: "success",
              },
              {
                icon: Activity,
                title: "Real-time Monitoring",
                description:
                  "Monitor containers, APIs, and services with customizable health checks",
                color: "primary",
              },
              {
                icon: Shield,
                title: "Safety Gates",
                description:
                  "Approval workflows and safety checks ensure critical actions are reviewed",
                color: "warning",
              },
              {
                icon: Code2,
                title: "Docker Native",
                description:
                  "Built-in Docker integration for container management and orchestration",
                color: "primary",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-[rgb(var(--border))] surface-elevated p-6 hover:shadow-lg hover:shadow-[rgb(var(--primary))]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-[rgb(var(--primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[rgb(var(--primary))]/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-[rgb(var(--primary))]" />
                </div>
                <h3 className="text-lg font-semibold text-[rgb(var(--foreground))] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[rgb(var(--foreground-muted))] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface-elevated))] to-[rgb(var(--surface))] p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border))_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-elevated border border-[rgb(var(--border))] mb-6">
                <Cpu className="h-3 w-3 text-[rgb(var(--primary))]" />
                <span className="text-xs font-medium text-[rgb(var(--foreground-muted))]">
                  Free to start, scale as you grow
                </span>
              </div>

              <h2 className="text-3xl font-bold text-[rgb(var(--foreground))] mb-4">
                Ready to automate your infrastructure?
              </h2>
              <p className="text-lg text-[rgb(var(--foreground-muted))] mb-8 max-w-2xl mx-auto">
                Join thousands of teams using AgentOS to build resilient,
                self-healing systems
              </p>

              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/builder"
                  className="px-6 py-3 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--primary-foreground))] font-medium transition-all flex items-center gap-2 shadow-lg shadow-[rgb(var(--primary))]/20"
                >
                  Start Building Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/builder"
                  className="px-6 py-3 rounded-lg border border-[rgb(var(--border))] surface-elevated hover:surface text-[rgb(var(--foreground))] font-medium transition-colors"
                >
                  Schedule Demo
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border))] surface py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[rgb(var(--primary))] flex items-center justify-center">
                <Activity className="h-4 w-4 text-[rgb(var(--primary-foreground))]" />
              </div>
              <span className="font-semibold text-[rgb(var(--foreground))]">
                AgentOS
              </span>
            </div>
            <p className="text-sm text-[rgb(var(--foreground-muted))]">
              © 2024 AgentOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
