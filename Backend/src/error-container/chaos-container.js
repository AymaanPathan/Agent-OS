const readline = require("readline");
const express = require("express");
const net = require("net");

const app = express();
const PORT = 8080;

// ============================================================================
// LOGGING UTILITIES - Ensures all logs are visible and properly formatted
// ============================================================================

/**
 * Force flush all logs immediately to stdout/stderr
 * This prevents Docker from buffering logs
 */
function forceLog(message, isError = false) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${message}`;

  if (isError) {
    process.stderr.write(formattedMsg + "\n");
  } else {
    process.stdout.write(formattedMsg + "\n");
  }
}

/**
 * Log to both stdout and stderr for maximum visibility
 */
function dualLog(message) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${message}`;

  process.stdout.write(formattedMsg + "\n");
  process.stderr.write(formattedMsg + "\n");
}

// ============================================================================
// HEALTH ENDPOINT
// ============================================================================

let chaosMode = "idle";
let chaosStartTime = null;
let errorCount = 0;
let activeIntervals = [];

app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  const health = {
    status: chaosMode === "idle" ? "healthy" : "degraded",
    ok: chaosMode === "idle",
    uptime: uptime,
    chaosMode: chaosMode,
    chaosRuntime: chaosStartTime ? Date.now() - chaosStartTime : 0,
    errorCount: errorCount,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
    },
    timestamp: new Date().toISOString(),
  };

  // Log health check to stderr so it shows in logs
  forceLog(`🏥 Health check: ${JSON.stringify(health)}`, false);

  res.json(health);
});

app.listen(PORT, () => {
  dualLog("🚀 Chaos container running on port " + PORT);
  dualLog(
    "📊 Health endpoint available at http://localhost:" + PORT + "/health",
  );
  dualLog(
    "🔍 All logs will be written to both stdout and stderr for maximum visibility",
  );
});

// Keep process alive forever
setInterval(() => {
  // Periodic heartbeat to prove container is alive
  forceLog(
    `💓 Container heartbeat - Mode: ${chaosMode}, Errors: ${errorCount}, Uptime: ${Math.round(process.uptime())}s`,
  );
}, 30000); // Every 30 seconds

// ============================================================================
// INTERACTIVE MENU
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

dualLog(`
╔════════════════════════════════════════════════════════════════╗
║                 🔥 CHAOS CONTAINER DEMO MODE 🔥                ║
╚════════════════════════════════════════════════════════════════╝

Available Chaos Modes (CONTINUOUS ERROR GENERATION):

  1 → 🔥 CPU Load         (Continuous CPU stress errors)
  2 → 💾 Memory Errors    (Continuous memory allocation failures)
  3 → 🗄️  DB Failures     (Continuous database connection errors)
  4 → ⛔ Timeout Errors   (Continuous request timeouts)
  5 → 💥 Exception Storm  (Continuous application exceptions)
  6 → 🌪️  All Chaos       (All error types running simultaneously!)
  7 → 🎯 Custom Mix       (Choose multiple modes)

Select ONE option (or press Enter for idle mode):
`);

rl.question("Select: ", (ans) => {
  rl.close();

  const option = ans.trim();

  if (option === "1") {
    chaosMode = "cpu-errors";
    cpuErrors();
  } else if (option === "2") {
    chaosMode = "memory-errors";
    memoryErrors();
  } else if (option === "3") {
    chaosMode = "db-errors";
    dbErrors();
  } else if (option === "4") {
    chaosMode = "timeout-errors";
    timeoutErrors();
  } else if (option === "5") {
    chaosMode = "exception-storm";
    exceptionStorm();
  } else if (option === "6") {
    chaosMode = "full-chaos";
    fullChaos();
  } else if (option === "7") {
    chaosMode = "custom-mix";
    customMix();
  } else {
    chaosMode = "idle";
    dualLog("⚪ No chaos mode selected - running in IDLE mode");
  }

  if (chaosMode !== "idle") {
    chaosStartTime = Date.now();
    dualLog(`✅ Chaos mode '${chaosMode}' started - continuous errors enabled`);
    dualLog(`🔍 Watch logs with: docker logs -f <container-name>`);
    dualLog(`⚠️  Container will NOT crash - all errors are safely contained`);
  }
});

// ============================================================================
// CHAOS MODE 1: CPU ERRORS (CONTINUOUS)
// ============================================================================

function cpuErrors() {
  dualLog("   → Generating CPU stress errors every 3-7 seconds");

  const generateCpuError = () => {
    errorCount++;

    const cpuUsage = Math.floor(Math.random() * 40) + 60; // 60-100%
    const responseTime = Math.floor(Math.random() * 500) + 200; // 200-700ms
    const affectedService = [
      "api-gateway",
      "user-service",
      "payment-processor",
      "data-analytics",
    ][Math.floor(Math.random() * 4)];

    forceLog(`❌ ERROR: CPU overload detected in ${affectedService}`, true);
    forceLog(
      `   CPU Usage: ${cpuUsage}% | Response Time: ${responseTime}ms | Threshold Exceeded: ${cpuUsage > 80 ? "YES" : "NO"}`,
      true,
    );
    forceLog(
      `   Impact: Request throttling initiated | Time: ${new Date().toISOString()}`,
      true,
    );
  };

  // Generate first error immediately
  generateCpuError();

  // Continue generating errors every 3-7 seconds
  const interval = setInterval(
    () => {
      generateCpuError();
    },
    Math.floor(Math.random() * 4000) + 3000,
  );

  activeIntervals.push(interval);
}

// ============================================================================
// CHAOS MODE 2: MEMORY ERRORS (CONTINUOUS)
// ============================================================================

function memoryErrors() {
  dualLog("💾 MEMORY ERROR MODE ACTIVATED - CONTINUOUS");
  dualLog("   → Generating memory allocation failures every 4-8 seconds");

  const generateMemoryError = () => {
    errorCount++;

    const memUsage = process.memoryUsage();
    const simulatedLeak = Math.floor(Math.random() * 50) + 10; // 10-60MB
    const affectedComponent = [
      "cache-manager",
      "session-store",
      "image-processor",
      "log-aggregator",
    ][Math.floor(Math.random() * 4)];

    forceLog(
      `❌ ERROR: Memory allocation failure in ${affectedComponent}`,
      true,
    );
    forceLog(
      `   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB | Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB | RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      true,
    );
    forceLog(
      `   Simulated Leak: ${simulatedLeak}MB | GC Triggered: ${Math.random() > 0.5 ? "YES" : "NO"} | Time: ${new Date().toISOString()}`,
      true,
    );
  };

  // Generate first error immediately
  generateMemoryError();

  // Continue generating errors every 4-8 seconds
  const interval = setInterval(
    () => {
      generateMemoryError();
    },
    Math.floor(Math.random() * 4000) + 4000,
  );

  activeIntervals.push(interval);
}

// ============================================================================
// CHAOS MODE 3: DATABASE ERRORS (CONTINUOUS)
// ============================================================================

function dbErrors() {
  dualLog("🗄️ DATABASE ERROR MODE ACTIVATED - CONTINUOUS");
  dualLog("   → Generating DB connection failures every 5-10 seconds");

  const generateDbError = () => {
    errorCount++;

    const errorTypes = [
      { code: "ECONNREFUSED", msg: "Connection refused" },
      { code: "ETIMEDOUT", msg: "Connection timeout" },
      { code: "ENOTFOUND", msg: "Host not found" },
      { code: "CONNECTION_POOL_EXHAUSTED", msg: "Connection pool exhausted" },
      { code: "DEADLOCK_DETECTED", msg: "Deadlock detected" },
      { code: "MAX_CONNECTIONS", msg: "Too many connections" },
    ];

    const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const database = [
      "postgres-primary",
      "postgres-replica",
      "redis-cache",
      "mongodb-shard",
    ][Math.floor(Math.random() * 4)];
    const retries = Math.floor(Math.random() * 3) + 1;

    forceLog(`❌ ERROR: Database connection failed - ${database}`, true);
    forceLog(`   Error Code: ${error.code} | Message: ${error.msg}`, true);
    forceLog(
      `   Target: 10.255.255.1:5432 | Retries: ${retries}/3 | Time: ${new Date().toISOString()}`,
      true,
    );

    // Simulate connection attempt (will fail safely)
    const s = new net.Socket();
    s.setTimeout(50);

    try {
      s.connect(5432, "10.255.255.1");
    } catch (err) {
      // Intentionally ignored
    }

    s.on("error", () => s.destroy());
    s.on("timeout", () => s.destroy());

    setTimeout(() => {
      if (!s.destroyed) s.destroy();
    }, 100);
  };

  // Generate first error immediately
  generateDbError();

  // Continue generating errors every 5-10 seconds
  const interval = setInterval(
    () => {
      generateDbError();
    },
    Math.floor(Math.random() * 5000) + 5000,
  );

  activeIntervals.push(interval);
}

// ============================================================================
// CHAOS MODE 4: TIMEOUT ERRORS (CONTINUOUS)
// ============================================================================

function timeoutErrors() {
  dualLog("⛔ TIMEOUT ERROR MODE ACTIVATED - CONTINUOUS");
  dualLog("   → Generating request timeouts every 3-6 seconds");

  const generateTimeoutError = () => {
    errorCount++;

    const timeoutDuration = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
    const endpoints = [
      { path: "/api/users", expected: 2000 },
      { path: "/api/orders", expected: 1500 },
      { path: "/api/products", expected: 1000 },
      { path: "/api/payments", expected: 3000 },
      { path: "/api/analytics", expected: 5000 },
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const client = ["mobile-app", "web-app", "partner-api", "internal-service"][
      Math.floor(Math.random() * 4)
    ];

    forceLog(`❌ ERROR: Request timeout - ${endpoint.path}`, true);
    forceLog(
      `   Timeout: ${timeoutDuration}ms | Expected: ${endpoint.expected}ms | Client: ${client}`,
      true,
    );
    forceLog(
      `   Action: Request aborted | Retry: ${Math.random() > 0.5 ? "YES" : "NO"} | Time: ${new Date().toISOString()}`,
      true,
    );
  };

  // Generate first error immediately
  generateTimeoutError();

  // Continue generating errors every 3-6 seconds
  const interval = setInterval(
    () => {
      generateTimeoutError();
    },
    Math.floor(Math.random() * 3000) + 3000,
  );

  activeIntervals.push(interval);
}

// ============================================================================
// CHAOS MODE 5: EXCEPTION STORM (CONTINUOUS)
// ============================================================================

function exceptionStorm() {
  dualLog("💥 EXCEPTION STORM MODE ACTIVATED - CONTINUOUS");
  dualLog("   → Generating application exceptions every 2-5 seconds");

  const generateException = () => {
    errorCount++;

    const exceptions = [
      {
        type: "TypeError",
        msg: "Cannot read property 'data' of undefined",
        location: "middleware/auth.js",
      },
      {
        type: "ReferenceError",
        msg: "user is not defined",
        location: "controllers/user.js",
      },
      {
        type: "SyntaxError",
        msg: "Unexpected token in JSON at position 42",
        location: "parsers/request.js",
      },
      {
        type: "RangeError",
        msg: "Maximum call stack size exceeded",
        location: "utils/recursive.js",
      },
      {
        type: "ValidationError",
        msg: "Invalid email format",
        location: "validators/input.js",
      },
      {
        type: "AuthenticationError",
        msg: "JWT token expired",
        location: "middleware/jwt.js",
      },
      {
        type: "Error",
        msg: "ENOENT: no such file or directory",
        location: "services/file.js",
      },
    ];

    const exception = exceptions[Math.floor(Math.random() * exceptions.length)];
    const lineNumber = Math.floor(Math.random() * 500) + 1;

    forceLog(`❌ ERROR: ${exception.type} - ${exception.msg}`, true);
    forceLog(`   Location: ${exception.location}:${lineNumber}`, true);
    forceLog(
      `   Stack Depth: ${Math.floor(Math.random() * 10) + 1} | Caught: YES | Time: ${new Date().toISOString()}`,
      true,
    );
  };

  // Generate first error immediately
  generateException();

  // Continue generating errors every 2-5 seconds
  const interval = setInterval(
    () => {
      generateException();
    },
    Math.floor(Math.random() * 3000) + 2000,
  );

  activeIntervals.push(interval);
}

// ============================================================================
// CHAOS MODE 6: FULL CHAOS (CONTINUOUS)
// ============================================================================

function fullChaos() {
  dualLog("🌪️  FULL CHAOS MODE ACTIVATED - CONTINUOUS");
  dualLog("   → Running ALL error types simultaneously!");
  dualLog("   → Maximum chaos for comprehensive demo");

  // Run all chaos modes at once
  cpuErrors();
  memoryErrors();
  dbErrors();
  timeoutErrors();
  exceptionStorm();

  dualLog("✅ Full chaos mode running - expect high error volume!");
}

// ============================================================================
// CHAOS MODE 7: CUSTOM MIX
// ============================================================================

function customMix() {
  dualLog("🎯 CUSTOM MIX MODE ACTIVATED");
  dualLog("   → Randomly mixing different error types");
  dualLog("   → Simulating realistic production scenarios");

  const modes = [
    { name: "CPU", func: cpuErrors },
    { name: "Memory", func: memoryErrors },
    { name: "Database", func: dbErrors },
  ];

  // Randomly select 2-3 modes to run
  const selectedModes = modes
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 2) + 2);

  selectedModes.forEach((mode) => {
    dualLog(`   ✓ Enabling ${mode.name} errors`);
    mode.func();
  });
}

// ============================================================================
// SIGNAL HANDLING
// ============================================================================

// Ignore SIGINT so container doesn't exit on Ctrl+C
process.on("SIGINT", () => {
  forceLog("⚠️  SIGINT received but IGNORED - container stays alive", true);
  dualLog(
    `📊 Current stats: Mode=${chaosMode}, Errors=${errorCount}, Runtime=${Math.round(process.uptime())}s`,
  );
});

// Ignore SIGTERM so container doesn't exit on docker stop
process.on("SIGTERM", () => {
  dualLog(
    `📊 Current stats: Mode=${chaosMode}, Errors=${errorCount}, Runtime=${Math.round(process.uptime())}s`,
  );
  // Don't exit - let chaos continue forever!
});

// Catch uncaught exceptions and log them (but don't crash)
process.on("uncaughtException", (err) => {
  errorCount++;
  forceLog(`💥 UNCAUGHT EXCEPTION (safely caught): ${err.message}`, true);
  forceLog(`   Stack: ${err.stack}`, true);
  dualLog("✅ Exception caught and logged - container still running");
  // Don't exit - let chaos continue!
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  errorCount++;
  forceLog(`💥 UNHANDLED PROMISE REJECTION (safely caught): ${reason}`, true);
  dualLog("✅ Rejection caught and logged - container still running");
  // Don't exit - let chaos continue!
});

// ============================================================================
// CLEANUP ON EXIT (if ever needed)
// ============================================================================

function cleanup() {
  dualLog("🧹 Cleaning up intervals...");
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals = [];
}

// Only cleanup on explicit process exit (not SIGTERM/SIGINT)
process.on("exit", () => {
  cleanup();
  dualLog("👋 Process exiting gracefully");
});

// ============================================================================
// STARTUP COMPLETE
// ============================================================================

dualLog("✅ Chaos container initialized and ready (DEMO MODE)");
dualLog("📝 Logging to both stdout and stderr for maximum visibility");
dualLog("🔍 All errors prefixed with ❌ ERROR for easy filtering");
dualLog("🛡️  Container will NEVER crash - all errors are safely contained");
dualLog("🎬 Perfect for demos, testing, and observability showcases");
