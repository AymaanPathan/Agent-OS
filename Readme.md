# 🤖 AgentOS — AI-Powered DevOps Automation

> Build, run, and monitor intelligent operational workflows using AI agent orchestration and MCP tools — with enterprise-grade security powered by **Archestra**.

![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Docker](https://img.shields.io/badge/built_with-Docker-blue?style=flat-square)
![MCP](https://img.shields.io/badge/tools-MCP-purple?style=flat-square)
![Archestra](https://img.shields.io/badge/security-Archestra-orange?style=flat-square)

<br />

<img width="1603" alt="hero" src="https://github.com/user-attachments/assets/9a68c05a-ba8e-4982-b91f-66b458095d40" />

---

## What is AgentOS?

AgentOS is a DevOps-first platform where anyone — engineers, product managers, support teams — can **build, run, and monitor AI-powered operational workflows** without writing infrastructure code.

No DevOps experience needed. Drag and drop tools, chat with AI in plain English, or let autonomous agents investigate and fix incidents automatically.

---

## Three Modes

| Mode | What You Do | Example |
|------|-------------|---------|
| **🔧 Runbook Mode** | Drag-and-drop workflow builder (like Zapier for containers) | `If container unhealthy → restart → send alert` |
| **📊 Monitor Mode** | Real-time dashboard with one-click actions | Click "Restart Container" or "AI Fix Suggestion" |
| **🤖 Agent Swarm Mode** | Chat with AI in natural language | `"Fix all unhealthy containers and notify me"` |

### 🔧 Runbook Mode — Drag-and-Drop Workflow Builder

<img width="1918" alt="workflow" src="https://github.com/user-attachments/assets/7b0fec37-3843-4019-b0be-815f22a703ff" />

### 📊 Monitor Mode — Real-Time Container Dashboard

<img width="1918" alt="Agent-OS-monitor" src="https://github.com/user-attachments/assets/e01acb57-6763-427c-b26e-637b3f94c2ba" />

<img width="1918" alt="Monitor-2" src="https://github.com/user-attachments/assets/8cab548d-2f33-4fb7-a955-9f156c36ae7b" />

### 🤖 Agent Swarm Mode — Natural Language Automation

<img width="1918" alt="Agent-1" src="https://github.com/user-attachments/assets/a461546b-956e-4ee2-b964-075ca77f8981" />

<img width="1918" alt="Agent-2" src="https://github.com/user-attachments/assets/302cbd7a-b5d8-4289-b717-2090e5d4e329" />

<img width="1918" alt="Agent-3" src="https://github.com/user-attachments/assets/748d4c6d-ce51-485c-9984-31f2def52601" />

---

## Who Is This For?

- **Product Managers** — Build workflows to restart services, send alerts, monitor uptime
- **Support Teams** — Create automated incident response, get AI-powered troubleshooting
- **Developers** — Manage test environments, analyze logs, deploy containers
- **Operations** — Monitor production, implement self-healing, manage incidents

---

## The Security Problem

### A Simple Example: "Monitor my database"

What you **think** happens:
```
Check if database is healthy → Alert me if there's a problem
```

What **actually** happens:
```
docker_logs        →  Reads container logs (passwords, API keys, connection strings inside)
ai_analyze         →  Sends your secrets to an external LLM
slack_notify       →  Your database password appears in a Slack channel
```

**Result: Sensitive data exposed.**

### The Lethal Trifecta

Three innocent-looking tools become dangerous in sequence:

```
Step 1: READ          docker_logs, health_check        → Accesses private data
Step 2: PROCESS       ai_analyze, execute_command      → Handles the content
Step 3: EXFILTRATE    slack_notify, send_email         → Sends it outside
```

Each tool is safe alone. Together, they form a **complete data exfiltration chain**.

### Why Traditional Security Fails

- Firewall rules don't inspect AI tool calls
- Access controls are already granted to the AI
- Workflows are built visually, not in code
- Attackers bypass controls with clever prompts

> You need security at the **AI orchestration level** — not the network level.

---

## The Solution: Archestra Tool Policies

AgentOS integrates with **[Archestra](https://archestra.ai)** — an agentic security engine that enforces policies **before** every tool executes, making data exfiltration structurally impossible regardless of what the AI decides.

```
Without Archestra:   docker_logs → ai_analyze → slack_notify   ❌ Secrets leaked

With Archestra:      docker_logs → ai_analyze → [BLOCKED] ✋   ✅ Exfiltration prevented
```

### How Archestra Works

Every MCP tool call in AgentOS is routed through the Archestra Security Engine:

```
AgentOS workflow triggers tool call
        ↓
Archestra intercepts BEFORE execution
        ↓
┌─────────────────────────────────┐
│  Check: Tool Invocation Policy  │  → block_always / block_when_untrusted / allow
│  Check: Data Context            │  → is this data trusted or untrusted?
└─────────────────────────────────┘
        ↓
  Block or Allow
        ↓
  Apply Trusted Data Policy       → mark_as_untrusted / sanitize_with_dual_llm / allow
        ↓
  Log result
```

No AI prompt can bypass this. The policy engine is **deterministic code**, not an AI decision.

---

## Archestra Policy Types

### 1. Tool Invocation Policies
Controls **when** a tool is allowed to run.

| Policy | Behavior | Example Use |
|--------|----------|-------------|
| `block_always` | Tool never executes | `docker_exec` — shell injection risk |
| `block_when_context_is_untrusted` | Blocked only when upstream data is untrusted | `slack_notify` — safe manually, dangerous after `docker_logs` |
| `allow` | Executes normally | `docker_status` — read-only metadata |

### 2. Trusted Data Policies
Controls **how** a tool's output is handled downstream.

| Policy | Behavior | Example Use |
|--------|----------|-------------|
| `mark_as_untrusted` | Flags output, restricts downstream tools | `docker_logs` — may contain secrets |
| `sanitize_with_dual_llm` | Two independent AIs verify before passing forward | `ai_analyze` — prevent prompt injection |
| `allow` | Output passes through unchanged | `docker_status` — safe metadata only |

---

## Real-World Policy Examples

### Example 1: Prevent Data Exfiltration

**Problem:** `docker_logs` contains secrets, `slack_notify` sends externally.

```yaml
# Trusted Data Policy
tool: docker_logs
action: mark_as_untrusted
reason: Logs may contain secrets

# Tool Invocation Policy
tool: slack_notify
action: block_when_context_is_untrusted
reason: Prevent data leakage
```

**What happens:**
```
docker_logs runs          → output marked UNTRUSTED
slack_notify attempts     → Archestra detects UNTRUSTED context
                          → BLOCKED
Error: "Cannot send untrusted data externally"
```

---

### Example 2: Block Prompt Injection

**Problem:** Malicious content hidden inside container logs could hijack the AI.

```yaml
tool: ai_analyze
action: sanitize_with_dual_llm
reason: Prevent prompt injection via log content
```

**How dual LLM sanitization works:**
```
docker_logs output → LLM #1: "Check for malicious instructions"
                   → LLM #2: "Verify independently"
                   → Both agree: SAFE  →  passes through
                   → Either flags: SUSPICIOUS  →  BLOCKED
```

Why two LLMs? A single AI can be fooled. Two independent models with different architectures create consensus that's extremely hard to bypass.

---

### Example 3: Block Dangerous Shell Execution

```yaml
tool: docker_exec
action: block_always
reason: Shell injection vulnerability
```

Any workflow attempting `docker_exec` is blocked before it runs — no exceptions, no overrides.

---

## How Archestra Protects Each Mode

### Runbook Mode
```
You drag:   docker_logs → slack_notify

Execution:
  docker_logs runs          ✅  output marked UNTRUSTED
  slack_notify attempts     ❌  BLOCKED by Archestra
  Error shown in UI:            "Policy violation — untrusted data cannot be sent externally"
```

### Monitor Mode
```
Container goes unhealthy
You click "Send Alert"

Archestra checks:
  Source: docker_logs  →  UNTRUSTED
  Destination: slack_notify  →  blocked for untrusted context

Result: Alert displayed on screen only. No external data leak.
```

### Agent Swarm Mode
```
You say: "Fix containers and notify me"

AI generates workflow and attempts execution.
Archestra blocks the notification step.
AI responds: "Containers fixed. Results shown on screen (data contains sensitive content)."
```

---

## Policy Violation Logs

Every blocked attempt is logged with full context:

```
⛔  2 min ago
    Workflow: "Database Health Monitor"
    Tool: slack_notify
    Reason: Blocked — untrusted data context
    Source: docker_logs

⛔  15 min ago
    Workflow: "Auto-Restart Services"
    Tool: docker_exec
    Reason: Blocked — always blocked
    Attempted: restart service

⚠️  1 hour ago
    Workflow: "Log Analysis"
    Tool: ai_analyze
    Action: Sanitized — dual LLM applied
    Detected: Potential prompt injection attempt
```

---

## Recommended Production Policies

```yaml
# Block dangerous execution
docker_exec:   block_always
docker_run:    block_always

# Mark data sources as untrusted
docker_logs:   mark_as_untrusted + sanitize_with_dual_llm
health_check:  mark_as_untrusted

# Restrict external communication
slack_notify:   block_when_context_is_untrusted
email_send:     block_when_context_is_untrusted
webhook_post:   block_when_context_is_untrusted

# Allow safe read-only operations
docker_status:  allow
docker_list:    allow
docker_restart: allow  # with validation
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  AgentOS                     │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Runbook  │ │ Monitor  │ │ Agent Swarm │  │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       └────────────┴──────────────┘          │
│              Workflow Execution Engine        │
│              MCP Tool Registry               │
└─────────────────┬───────────────────────────┘
                  │ Every tool call
                  ↓
┌─────────────────────────────────────────────┐
│              Archestra Security              │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │         Agentic Security Engine      │   │
│  │  • Intercept every MCP call          │   │
│  │  • Check invocation policy           │   │
│  │  • Check data trust context          │   │
│  │  • Block or allow                    │   │
│  │  • Mark output trust level           │   │
│  │  • Sanitize with dual LLM if needed  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Invocation   │  │  Trusted Data        │ │
│  │ Policies     │  │  Policies            │ │
│  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────┘
                  │
                  ↓
         Docker Containers
```

---

## Getting Started

**Total setup time: ~20 minutes**

### Step 1 — Enable Archestra (5 min)
Configure AgentOS to connect to the Archestra platform:
- Set Archestra proxy URL
- Add authentication token
- Enable policy enforcement

### Step 2 — Apply Basic Policies (10 min)
Set these essential policies through the Archestra dashboard:
- Block external comms with untrusted data
- Mark container logs as untrusted
- Sanitize AI analysis outputs
- Block shell execution tools

### Step 3 — Test Protection (5 min)
Create a test workflow: `docker_logs → slack_notify` and run it.

Expected result:
```
❌ Policy Violation
   Tool: slack_notify
   Reason: Cannot send untrusted data externally
   Your data stayed safe.
```

### Step 4 — Monitor Violations (ongoing)
Review Archestra violation logs regularly to spot attack attempts, fix broken workflows, and tune policies.

---

## Why Archestra Policies Work

| Property | Detail |
|----------|--------|
| **Deterministic** | Rules enforced by code, not AI decisions |
| **Platform-level** | Blocks before tool execution, not after |
| **No bypass** | Even a compromised AI cannot override policies |
| **Context-aware** | Tracks data trust through the entire workflow |
| **Real-time** | Every tool call checked, every time |
| **<1ms overhead** | No meaningful performance impact |

### Security Principles

- **Defense in Depth** — Tool invocation policies + trusted data policies + dual LLM verification work together
- **Zero Trust** — All container data and external data starts as untrusted; trust must be explicitly granted
- **Fail Secure** — If policy check fails, if context is unclear, if sanitization fails → block. Default to deny.

---

## Demo

▶ [Watch the full demo on YouTube](https://youtu.be/-6d2XvXcMlk)

---

## License

MIT
