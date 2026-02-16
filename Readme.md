# AgentOS + Guardian Security
## Secure AI-Powered Container Management for Everyone

---

## Who Can Use AgentOS?

**No DevOps experience needed.** AgentOS makes container management simple for:

- **Product Managers**: Build workflows to restart services, send alerts, monitor uptime
- **Support Teams**: Create automated incident response, get AI-powered troubleshooting
- **Developers**: Manage test environments, analyze logs, deploy containers
- **Operations**: Monitor production, implement self-healing, manage incidents
- **Anyone**: Use drag-and-drop workflows or just chat with AI in plain English

**Three Simple Modes:**

| Mode | What You Do | Example |
|------|-------------|---------|
| **Runbook Mode** | Drag-and-drop workflow builder (like Zapier for containers) | "If container unhealthy → restart → send alert" |
| **Monitor Mode** | Real-time dashboard with one-click actions | Click "Restart Container" or "AI Fix Suggestion" |
| **Agent Swarm Mode** | Chat with AI in natural language | "Fix all unhealthy containers and notify me" |

**Guardian Mode** adds automatic security to all three modes.

---

## The Problem

### Simple Example: "Monitor my database"

**What you want:**
- Check if database is healthy
- Alert me if there's a problem

**What actually happens:**
```
1. Read container logs (contains passwords, API keys, connection strings)
2. AI analyzes logs (sends your secrets to external LLM)
3. Post to Slack (your database password now in #general channel)

Result: Your secrets are leaked 🚨
```

### The Lethal Trifecta Pattern

Three innocent-looking tools become dangerous together:

```
Step 1: READ - Tool accesses private data
        Examples: docker_logs, health_check

Step 2: PROCESS - Tool handles content
        Examples: ai_analyze, execute_command

Step 3: EXFILTRATE - Tool communicates externally
        Examples: slack_notify, send_email

Alone: Each tool is safe ✅
Together: Complete data exfiltration chain ❌
```

**Why traditional security doesn't work:**
- Firewall rules don't inspect AI tool calls
- Access controls already granted to AI
- Workflows built visually, not coded
- Attackers bypass with clever prompts

**You need security at the AI orchestration level.**

---

## The Solution

### Guardian + Archestra = Protection Layer

**Guardian scans tools → Archestra enforces policies**

```
Before Guardian:
docker_logs → ai_analyze → slack_notify
❌ Secrets leaked

After Guardian:
docker_logs → ai_analyze → [ARCHESTRA BLOCKS] → slack_notify
✅ Exfiltration prevented
```

**How It Works:**

**1. Guardian Scans (Automatic)**
- Analyzes every tool in AgentOS
- Finds dangerous combinations
- Calculates security score (A-F grade)
- Generates protection policies

**2. Archestra Enforces (Before Every Tool Call)**
- Checks if tool is allowed to run
- Verifies data context is safe
- Blocks dangerous operations
- No bypass possible

**3. You Stay Protected (Always)**
- All modes secured automatically
- Violations logged and visible
- Works invisibly in background

---

## How It Protects You

### Trust Scoring

Every tool gets a security grade:

| Grade | Score | Meaning | Action |
|-------|-------|---------|--------|
| **A** | 90-100 | Safe to use anywhere | ✅ Allowed |
| **B** | 80-89 | Minor concerns | ✅ Allowed with monitoring |
| **C** | 70-79 | Use with caution | ⚠️ Apply light policies |
| **D** | 60-69 | Risky | ⚠️ Apply strict policies |
| **F** | 0-59 | Dangerous | ❌ Block or sanitize |

**Example Trust Report:**
```
docker_status     ✅ A (95/100) - Safe
docker_logs       ⚠️ D (65/100) - Exposes data
docker_restart    ✅ B (85/100) - Minor risk
ai_analyze        ⚠️ D (60/100) - Processes untrusted input
slack_notify      ⚠️ C (70/100) - External communication
health_check      ✅ A (98/100) - Safe

⚠️ CRITICAL: Lethal Trifecta Detected!
docker_logs + ai_analyze + slack_notify = Data exfiltration chain
```

### Protection Policies

**Tool Invocation Policies** (Archestra blocks dangerous tools):
```
Policy: slack_notify → block_when_context_is_untrusted

Meaning: Slack works normally, BUT blocked if sending data from:
         - Container logs
         - Health checks
         - Any external source

Why: Prevents leaking secrets
```

**Trusted Data Policies** (Archestra cleans dangerous outputs):
```
Policy: docker_logs → sanitize_with_dual_llm

Meaning: Every log output checked by TWO independent AIs for:
         - Hidden instructions
         - Malicious commands

Why: Prevents prompt injection attacks
```

### Real-Time Enforcement

**Before ANY tool runs**, Archestra checks:

```
User: "Send logs to Slack"

Archestra:
├─ Step 1: Get logs from docker_logs
│         → Mark output as UNTRUSTED (came from container)
│
├─ Step 2: Try to send via slack_notify
│         → Policy check: block_when_context_is_untrusted
│         → Context = UNTRUSTED ❌
│
└─ Result: BLOCKED
          "Policy violation: Cannot send untrusted data externally"
```

**Platform-level enforcement** - No AI prompt can bypass this.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AgentOS Platform                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Runbook  │  │ Monitor  │  │  Agent   │  │Guardian││
│  │   Mode   │  │   Mode   │  │  Swarm   │  │  Mode  ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       └──────────────┴─────────────┴────────────┘     │
│                      │                                  │
│         ┌────────────▼──────────────┐                  │
│         │  Workflow Execution       │                  │
│         └────────────┬──────────────┘                  │
│                      │                                  │
│         ┌────────────▼──────────────┐                  │
│         │  MCP Tool Registry        │                  │
│         └────────────┬──────────────┘                  │
└──────────────────────┼─────────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │      Archestra AI Platform              │
        │                                         │
        │  ┌───────────────────────────────────┐ │
        │  │  Agentic Security Engine          │ │
        │  │                                   │ │
        │  │  Before every MCP tool call:     │ │
        │  │  1. Check tool invocation policy │ │
        │  │  2. Check data context (trusted?)│ │
        │  │  3. Block or allow               │ │
        │  │                                   │ │
        │  │  After every MCP tool call:      │ │
        │  │  1. Apply trusted data policy    │ │
        │  │  2. Mark output trust level      │ │
        │  │  3. Sanitize if needed           │ │
        │  └───────────────────────────────────┘ │
        │                                         │
        │  ┌───────────────────────────────────┐ │
        │  │  Guardian MCP Server              │ │
        │  │                                   │ │
        │  │  • scan_server                   │ │
        │  │  • generate_policy               │ │
        │  │  • trust_score                   │ │
        │  │  • test_server                   │ │
        │  │  • monitor                       │ │
        │  │  • audit_report                  │ │
        │  └───────────────────────────────────┘ │
        └─────────────────────────────────────────┘
```

**Security Flow:**
1. AgentOS workflow calls MCP tool
2. Call goes through Archestra
3. Archestra Security Engine intercepts
4. Checks policies before execution
5. Blocks if policy violation
6. If allowed, marks output trust level
7. Applies data sanitization policies

---

## How It Protects All Three Modes

### Runbook Mode (Drag-and-Drop)

**Without Guardian:**
```
You drag: docker_logs → slack_notify
Result: Works, but leaks secrets ❌
```

**With Guardian:**
```
You drag: docker_logs → slack_notify

Archestra blocks at runtime:
⚠️ Policy Violation
   slack_notify cannot send untrusted data
   
Your data stays safe ✅
```

### Monitor Mode (One-Click Dashboard)

**Without Guardian:**
```
Click "Send Alert" → Sends everything including secrets ❌
```

**With Guardian:**
```
Click "Send Alert" → Archestra checks context
If contains log data: BLOCKED ✅
If manual message: Allowed ✅
```

### Agent Swarm Mode (Natural Language)

**Without Guardian:**
```
You: "Fix containers and notify me"
AI: Creates workflow, sends logs to Slack ❌
```

**With Guardian:**
```
You: "Fix containers and notify me"
AI: Creates workflow
Archestra: Blocks notification step (untrusted data)
AI: "I fixed the containers. Results on screen (logs contain sensitive data)" ✅
```

---

## Guardian Mode Dashboard

When you open Guardian Mode:

```
┌─────────────────────────────────────────────────┐
│ Guardian Security Dashboard                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Overall Trust Score: 73/100 (Grade: C)        │
│  Active Policies: 12                           │
│  Violations (24h): 3                           │
│                                                 │
│  [Scan All Tools]  [Apply Protection]          │
│                                                 │
├─────────────────────────────────────────────────┤
│ Your Tools:                                     │
│                                                 │
│  ✅ docker_status      A (95/100)              │
│  ⚠️ docker_logs        D (65/100)  [Protected] │
│  ✅ docker_restart     B (85/100)              │
│  ⚠️ ai_analyze         D (60/100)  [Protected] │
│  ⚠️ slack_notify       C (70/100)  [Protected] │
│  ✅ health_check       A (98/100)              │
│                                                 │
│  🚨 Alert: Lethal Trifecta Detected            │
│     docker_logs + ai_analyze + slack_notify    │
│     [Fix Now]                                  │
│                                                 │
├─────────────────────────────────────────────────┤
│ Recent Violations:                              │
│                                                 │
│  🔴 2 min ago - slack_notify blocked           │
│     Workflow: "Database Monitor"               │
│     Reason: Attempted to send untrusted data   │
│                                                 │
│  🟡 15 min ago - docker_logs sanitized         │
│     Workflow: "Log Analysis"                   │
│     Reason: Dual LLM check applied             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Getting Started

### Step 1: Enable (5 minutes)

Add to AgentOS configuration:
```bash
GUARDIAN_ENABLED=true
ARCHESTRA_API_KEY=your_key
```

Restart AgentOS.

### Step 2: Scan (1 minute)

1. Open Guardian mode
2. Click "Scan All Tools"
3. Review trust scores

### Step 3: Protect (1 minute)

Click "Fix Now" on any Lethal Trifecta alert.

Archestra applies policies automatically.

### Step 4: Verify (2 minutes)

Try to create: docker_logs → slack_notify

Should see:
```
⚠️ Policy Violation
slack_notify blocked by Archestra

Your data is protected ✅
```

**Total setup: 10 minutes**

---

## Vulnerability Categories

Guardian scans for 7 types of vulnerabilities:

1. **Prompt Injection** - Hidden instructions in tool descriptions
2. **Command Injection** - Unvalidated shell execution
3. **Data Exfiltration** - External communication tools
4. **PII Exposure** - Leaking sensitive data
5. **Excessive Permissions** - root/admin access
6. **Missing Validation** - No input checking
7. **Tool Poisoning** - Generic names shadowing legitimate tools

Plus **Lethal Trifecta Detection** - dangerous tool combinations

---

## Why Archestra Enforcement Works

### Traditional Security (Fails)

```
User creates workflow
↓
AI processes request
↓
AI decides to leak data (prompt injection)
↓
Data sent to attacker ❌
```

### Archestra Security (Blocks)

```
User creates workflow
↓
Workflow tries to execute
↓
Archestra intercepts BEFORE execution
↓
Policy check: block_when_context_is_untrusted
↓
Context is untrusted
↓
Archestra blocks at platform level
↓
Workflow fails safely ✅
```

**Key Difference:** Archestra doesn't trust AI decisions. It enforces deterministic policies before tools run.

---

## Common Questions

**Q: Will this break my workflows?**  
A: Only unsafe ones. You'll see clear warnings and alternatives.

**Q: Can I override policies?**  
A: Yes, but Guardian warns about risks.

**Q: How do I know if attacks were blocked?**  
A: Check Guardian → "Recent Violations"

**Q: Does this work in all three modes?**  
A: Yes. Runbook, Monitor, and Agent Swarm all protected.

**Q: Can attackers disable policies?**  
A: No. Archestra enforces at platform level. No bypass possible.

**Q: Does this slow down workflows?**  
A: No. Policy checks add <1ms overhead.

---

## Summary

### The Problem
- AgentOS workflows can accidentally leak secrets
- Simple tool combinations create data exfiltration chains
- Traditional security doesn't work at AI orchestration level

### The Solution
- Guardian scans tools for vulnerabilities
- Detects Lethal Trifecta patterns
- Generates Archestra security policies
- Archestra enforces BEFORE tools execute
- No AI prompt can bypass platform-level blocking

### For You
- **10-minute setup** - Enable, scan, protect
- **Zero maintenance** - Auto-scans, auto-updates
- **All modes protected** - Runbook, Monitor, Agent Swarm
- **Enterprise-grade** - Platform-level enforcement

### Next Steps
1. Enable Guardian in settings
2. Run first scan
3. Apply recommended policies
4. Build workflows confidently

**Secure automation for everyone.**
