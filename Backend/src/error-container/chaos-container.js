const readline = require("readline");
const express = require("express");
const net = require("net");

const app = express();
const PORT = 8080;

// ============================================================================
// LOGGING UTILITIES - Ensures all logs are visible and properly formatted
// ============================================================================
// Container to generate error dynamically and should not stop and generate one error so its not stop
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

app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  const health = {
    status: chaosMode === "idle" ? "healthy" : "unhealthy",
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
  forceLog(`🏥 Health check: ${JSON.stringify(health)}`, true);

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
    `💓 Container heartbeat - Mode: ${chaosMode}, Errors: ${errorCount}`,
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
║                    🔥 CHAOS CONTAINER MENU 🔥                  ║
╚════════════════════════════════════════════════════════════════╝

Available Chaos Modes (ONE-TIME ERRORS):

  1 → 🔥 CPU Load         (ONE CPU error)
  2 → 💾 Memory Errors    (ONE memory error)
  3 → 🗄️  DB Failures     (ONE DB connection error)
  4 → ⛔ Timeout Errors   (ONE timeout error)
  5 → 💥 Exception Storm  (ONE exception error)
  6 → 🌪️  All Chaos       (ONE error of each type!)

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
  } else {
    chaosMode = "idle";
    dualLog("⚪ No chaos mode selected - running in IDLE mode");
    dualLog("📊 Container will serve health checks but generate no errors");
  }

  if (chaosMode !== "idle") {
    chaosStartTime = Date.now();
    dualLog(`✅ Chaos mode '${chaosMode}' started - error(s) generated`);
    dualLog(`🔍 Watch logs with: docker logs -f <container-name>`);
  }
});

// ============================================================================
// CHAOS MODE 1: CPU ERRORS (ONE-TIME)
// ============================================================================

function cpuErrors() {
  dualLog("🔥 CPU ERROR MODE ACTIVATED");
  dualLog("   → Will generate ONE CPU error");

  errorCount++;

  const cpuUsage = Math.floor(Math.random() * 40) + 60; // 60-100%
  const responseTime = Math.floor(Math.random() * 500) + 200; // 200-700ms

  forceLog(`❌ ERROR: CPU overload - High CPU usage detected`, true);
  forceLog(
    `   Simulated CPU: ${cpuUsage}% | Response time: ${responseTime}ms | Time: ${new Date().toISOString()}`,
    true,
  );

  dualLog("✅ CPU error generated (ONE TIME ONLY)");
}

// ============================================================================
// CHAOS MODE 2: MEMORY ERRORS (ONE-TIME)
// ============================================================================

function memoryErrors() {
  dualLog("💾 MEMORY ERROR MODE ACTIVATED");
  dualLog("   → Will generate ONE memory error");

  errorCount++;

  const memUsage = process.memoryUsage();
  const simulatedLeak = Math.floor(Math.random() * 50) + 10; // 10-60MB

  forceLog(`❌ ERROR: Memory allocation failure`, true);
  forceLog(
    `   Simulated leak: ${simulatedLeak}MB | Actual Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB | RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB | Time: ${new Date().toISOString()}`,
    true,
  );

  dualLog("✅ Memory error generated (ONE TIME ONLY)");
}

// ============================================================================
// CHAOS MODE 3: DATABASE ERRORS (ONE-TIME)
// ============================================================================

function dbErrors() {
  dualLog("🗄️ DATABASE ERROR MODE ACTIVATED");
  dualLog("   → Will generate ONE DB connection error");

  errorCount++;

  // Create socket but destroy it immediately - no timeout waiting
  const s = new net.Socket();
  const startTime = Date.now();

  // Set very short timeout to fail fast
  s.setTimeout(50); // Only 50ms timeout

  // Attempt connection to unroutable IP
  try {
    s.connect(5432, "10.255.255.1");
  } catch (err) {
    // Ignore connection errors
  }

  s.on("error", (err) => {
    const elapsed = Date.now() - startTime;
    forceLog(`❌ ERROR: Database connection failed after ${elapsed}ms`, true);
    forceLog(
      `   Error: ${err.code || "CONNECTION_REFUSED"} | Target: 10.255.255.1:5432 | Time: ${new Date().toISOString()}`,
      true,
    );
    s.destroy();
    dualLog("✅ Database error generated (ONE TIME ONLY)");
  });

  s.on("timeout", () => {
    const elapsed = Date.now() - startTime;
    forceLog(
      `❌ ERROR: Database connection timed out after ${elapsed}ms`,
      true,
    );
    forceLog(
      `   Target: 10.255.255.1:5432 | Time: ${new Date().toISOString()}`,
      true,
    );
    s.destroy();
    dualLog("✅ Database error generated (ONE TIME ONLY)");
  });

  // Force destroy after 100ms regardless
  setTimeout(() => {
    if (!s.destroyed) {
      s.destroy();
      dualLog("✅ Database error generated (ONE TIME ONLY)");
    }
  }, 100);
}

// ============================================================================
// CHAOS MODE 4: TIMEOUT ERRORS (ONE-TIME)
// ============================================================================

function timeoutErrors() {
  dualLog("⛔ TIMEOUT ERROR MODE ACTIVATED");
  dualLog("   → Will generate ONE timeout error");

  errorCount++;

  const timeoutDuration = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
  const endpoint = [
    "/api/users",
    "/api/orders",
    "/api/products",
    "/api/payments",
  ][Math.floor(Math.random() * 4)];

  forceLog(`❌ ERROR: Request timeout - ${endpoint}`, true);
  forceLog(
    `   Timeout after: ${timeoutDuration}ms | Expected: 2000ms | Time: ${new Date().toISOString()}`,
    true,
  );

  dualLog("✅ Timeout error generated (ONE TIME ONLY)");
}

// ============================================================================
// CHAOS MODE 5: EXCEPTION STORM (ONE-TIME)
// ============================================================================

function exceptionStorm() {
  dualLog("💥 EXCEPTION STORM MODE ACTIVATED");
  dualLog("   → Will generate ONE exception error");

  errorCount++;

  const exceptionTypes = [
    "TypeError: Cannot read property 'data' of undefined",
    "ReferenceError: user is not defined",
    "SyntaxError: Unexpected token in JSON at position 42",
    "RangeError: Maximum call stack size exceeded",
    "URIError: URI malformed",
    "EvalError: Illegal eval invocation",
    "Error: ENOENT: no such file or directory",
    "Error: ECONNREFUSED: Connection refused",
    "Error: ETIMEDOUT: Request timeout",
    "Error: ENOTFOUND: DNS lookup failed",
  ];

  const exception =
    exceptionTypes[Math.floor(Math.random() * exceptionTypes.length)];

  forceLog(`❌ ERROR: Exception - ${exception}`, true);
  forceLog(
    `   Stack: Error at processData (app.js:${Math.floor(Math.random() * 500)}) | Time: ${new Date().toISOString()}`,
    true,
  );

  dualLog("✅ Exception error generated (ONE TIME ONLY)");
}

// ============================================================================
// CHAOS MODE 6: FULL CHAOS (ONE-TIME FOR EACH TYPE)
// ============================================================================

function fullChaos() {
  dualLog("🌪️  FULL CHAOS MODE ACTIVATED");
  dualLog("   → Generating ONE error of each type!");
  dualLog("   → Errors across CPU, memory, DB, timeouts, and exceptions");

  // Run all chaos modes at once (each generates one error)
  cpuErrors();
  memoryErrors();
  dbErrors();
  timeoutErrors();
  exceptionStorm();

  dualLog("✅ Full chaos mode complete - all errors generated (ONE TIME EACH)");
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
  forceLog("⚠️  SIGTERM received but IGNORED - chaos continues!", true);
  dualLog(
    `📊 Current stats: Mode=${chaosMode}, Errors=${errorCount}, Runtime=${Math.round(process.uptime())}s`,
  );
  // Don't exit - let chaos continue forever!
});

// Catch uncaught exceptions and log them (but don't crash)
process.on("uncaughtException", (err) => {
  errorCount++;
  forceLog(`💥 UNCAUGHT EXCEPTION (caught by handler): ${err.message}`, true);
  forceLog(`   Stack: ${err.stack}`, true);
  // Don't exit - let chaos continue!
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  errorCount++;
  forceLog(
    `💥 UNHANDLED PROMISE REJECTION (caught by handler): ${reason}`,
    true,
  );
  // Don't exit - let chaos continue!
});

// ============================================================================
// STARTUP COMPLETE
// ============================================================================

dualLog("✅ Chaos container initialized and ready (ONE-TIME ERROR MODE)");
dualLog("📝 Logging to both stdout and stderr for maximum visibility");
dualLog("🔍 All errors will be prefixed with ❌ ERROR for easy filtering");
dualLog("🛡️  Container will NOT crash or be killed - all errors are safe");
