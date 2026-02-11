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

Available Chaos Modes (SAFE - Won't Kill Container):

  1 → 🔥 CPU Load         (Simulated CPU errors without saturation)
  2 → 💾 Memory Errors    (Simulated memory issues without OOM)
  3 → 🗄️  DB Failures     (Fast DB connection errors)
  4 → ⛔ Timeout Errors   (Simulated slow responses)
  5 → 💥 Exception Storm  (Continuous caught exceptions)
  6 → 🌪️  All Chaos       (Everything at once!)

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
    dualLog(
      `✅ Chaos mode '${chaosMode}' started - container will run forever`,
    );
    dualLog(`🔍 Watch logs with: docker logs -f <container-name>`);
  }
});

// ============================================================================
// CHAOS MODE 1: CPU ERRORS (SAFE)
// ============================================================================

function cpuErrors() {
  dualLog("🔥 CPU ERROR MODE ACTIVATED (SAFE)");
  dualLog(
    "   → Will simulate CPU errors every second without actual saturation",
  );

  let cycleCount = 0;

  setInterval(() => {
    cycleCount++;
    errorCount++;

    const cpuUsage = Math.floor(Math.random() * 40) + 60; // 60-100%
    const responseTime = Math.floor(Math.random() * 500) + 200; // 200-700ms

    forceLog(
      `❌ ERROR: CPU overload cycle #${cycleCount} - High CPU usage detected`,
      true,
    );
    forceLog(
      `   Simulated CPU: ${cpuUsage}% | Response time: ${responseTime}ms | Time: ${new Date().toISOString()}`,
      true,
    );
  }, 1000);
}

// ============================================================================
// CHAOS MODE 2: MEMORY ERRORS (SAFE - NO ACTUAL LEAK)
// ============================================================================

function memoryErrors() {
  dualLog("💾 MEMORY ERROR MODE ACTIVATED (SAFE)");
  dualLog(
    "   → Will simulate memory errors every second without actual allocation",
  );

  let errorNumber = 0;

  setInterval(() => {
    errorNumber++;
    errorCount++;

    const memUsage = process.memoryUsage();
    const simulatedLeak = Math.floor(Math.random() * 50) + 10; // 10-60MB

    forceLog(`❌ ERROR: Memory allocation failure #${errorNumber}`, true);
    forceLog(
      `   Simulated leak: ${simulatedLeak}MB | Actual Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB | RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB | Time: ${new Date().toISOString()}`,
      true,
    );
  }, 1000);
}

// ============================================================================
// CHAOS MODE 3: DATABASE ERRORS (SAFE - FAST FAIL)
// ============================================================================

function dbErrors() {
  dualLog("🗄️ DATABASE ERROR MODE ACTIVATED (SAFE)");
  dualLog(
    "   → Will generate DB connection errors every 500ms with instant fail",
  );

  let attemptCount = 0;

  setInterval(() => {
    attemptCount++;
    errorCount++;

    // Create socket but destroy it immediately - no timeout waiting
    const s = new net.Socket();
    const attemptId = attemptCount;
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
      forceLog(
        `❌ ERROR: Database connection #${attemptId} failed after ${elapsed}ms`,
        true,
      );
      forceLog(
        `   Error: ${err.code || "CONNECTION_REFUSED"} | Target: 10.255.255.1:5432 | Time: ${new Date().toISOString()}`,
        true,
      );
      s.destroy();
    });

    s.on("timeout", () => {
      const elapsed = Date.now() - startTime;
      forceLog(
        `❌ ERROR: Database connection #${attemptId} timed out after ${elapsed}ms`,
        true,
      );
      forceLog(
        `   Target: 10.255.255.1:5432 | Time: ${new Date().toISOString()}`,
        true,
      );
      s.destroy();
    });

    // Force destroy after 100ms regardless
    setTimeout(() => {
      if (!s.destroyed) {
        s.destroy();
      }
    }, 100);
  }, 500);
}

// ============================================================================
// CHAOS MODE 4: TIMEOUT ERRORS (SAFE)
// ============================================================================

function timeoutErrors() {
  dualLog("⛔ TIMEOUT ERROR MODE ACTIVATED (SAFE)");
  dualLog("   → Will simulate timeout errors every 2 seconds");

  let timeoutCount = 0;

  setInterval(() => {
    timeoutCount++;
    errorCount++;

    const timeoutDuration = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
    const endpoint = [
      "/api/users",
      "/api/orders",
      "/api/products",
      "/api/payments",
    ][Math.floor(Math.random() * 4)];

    forceLog(`❌ ERROR: Request timeout #${timeoutCount} - ${endpoint}`, true);
    forceLog(
      `   Timeout after: ${timeoutDuration}ms | Expected: 2000ms | Time: ${new Date().toISOString()}`,
      true,
    );
  }, 2000);
}

// ============================================================================
// CHAOS MODE 5: EXCEPTION STORM (SAFE - ALL CAUGHT)
// ============================================================================

function exceptionStorm() {
  dualLog("💥 EXCEPTION STORM MODE ACTIVATED (SAFE)");
  dualLog("   → Will throw and catch random exceptions every 1-3 seconds");

  let crashCount = 0;

  function scheduleNextException() {
    const delay = 1000 + Math.random() * 2000; // 1-3 seconds

    setTimeout(() => {
      crashCount++;
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

      forceLog(`❌ ERROR: Exception #${crashCount} - ${exception}`, true);
      forceLog(
        `   Stack: Error at processData (app.js:${Math.floor(Math.random() * 500)}) | Time: ${new Date().toISOString()}`,
        true,
      );

      scheduleNextException();
    }, delay);
  }

  scheduleNextException();
}

// ============================================================================
// CHAOS MODE 6: FULL CHAOS (SAFE)
// ============================================================================

function fullChaos() {
  dualLog("🌪️  FULL CHAOS MODE ACTIVATED (SAFE)");
  dualLog("   → ALL chaos modes running simultaneously!");
  dualLog(
    "   → Generates errors across CPU, memory, DB, timeouts, and exceptions",
  );

  // Run all chaos modes at once
  cpuErrors();
  memoryErrors();
  dbErrors();
  timeoutErrors();
  exceptionStorm();

  dualLog("✅ Full chaos mode active - container will NOT crash!");
  dualLog("   All errors are simulated or safely caught");
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

dualLog("✅ Chaos container initialized and ready (SAFE MODE)");
dualLog("📝 Logging to both stdout and stderr for maximum visibility");
dualLog("🔍 All errors will be prefixed with ❌ ERROR for easy filtering");
dualLog("🛡️  Container will NOT crash or be killed - all errors are safe");
