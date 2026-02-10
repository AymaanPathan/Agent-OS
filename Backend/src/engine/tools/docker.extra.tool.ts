import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ====================================
// 🐳 DOCKER EXTRA TOOLS (ENHANCED WITH LOGGING)
// ====================================

export async function runDockerStop(config: { containerName: string }) {
  console.log("🛑 [DockerStop] Starting docker stop");
  console.log("🛑 [DockerStop] Config:", JSON.stringify(config, null, 2));

  try {
    const command = `docker stop ${config.containerName}`;
    console.log("🛑 [DockerStop] Executing:", command);

    await execAsync(command);

    const result = {
      success: true,
      action: "stop",
      containerName: config.containerName,
    };

    console.log("✅ [DockerStop] Success:", JSON.stringify(result, null, 2));
    return result;
  } catch (err: any) {
    console.log("❌ [DockerStop] Error:", err.message);

    const result = {
      success: false,
      action: "stop",
      containerName: config.containerName,
      error: err.message,
    };

    console.log(
      "❌ [DockerStop] Error result:",
      JSON.stringify(result, null, 2),
    );
    return result;
  }
}

export async function runDockerStart(config: { containerName: string }) {
  console.log("▶️ [DockerStart] Starting docker start");
  console.log("▶️ [DockerStart] Config:", JSON.stringify(config, null, 2));

  try {
    const command = `docker start ${config.containerName}`;
    console.log("▶️ [DockerStart] Executing:", command);

    await execAsync(command);

    const result = {
      success: true,
      action: "start",
      containerName: config.containerName,
    };

    console.log("✅ [DockerStart] Success:", JSON.stringify(result, null, 2));
    return result;
  } catch (err: any) {
    console.log("❌ [DockerStart] Error:", err.message);

    const result = {
      success: false,
      action: "start",
      containerName: config.containerName,
      error: err.message,
    };

    console.log(
      "❌ [DockerStart] Error result:",
      JSON.stringify(result, null, 2),
    );
    return result;
  }
}

export async function runDockerRemove(config: {
  containerName: string;
  force?: boolean;
}) {
  console.log("🗑️ [DockerRemove] Starting docker remove");
  console.log("🗑️ [DockerRemove] Config:", JSON.stringify(config, null, 2));

  try {
    const force = config.force !== false;
    console.log("🗑️ [DockerRemove] Force:", force);

    const command = `docker rm ${force ? "-f" : ""} ${config.containerName}`;
    console.log("🗑️ [DockerRemove] Executing:", command);

    await execAsync(command);

    const result = {
      success: true,
      action: "remove",
      containerName: config.containerName,
    };

    console.log("✅ [DockerRemove] Success:", JSON.stringify(result, null, 2));
    return result;
  } catch (err: any) {
    console.log("❌ [DockerRemove] Error:", err.message);

    const result = {
      success: false,
      action: "remove",
      containerName: config.containerName,
      error: err.message,
    };

    console.log(
      "❌ [DockerRemove] Error result:",
      JSON.stringify(result, null, 2),
    );
    return result;
  }
}

export async function runDockerPruneSystem(config: { all?: boolean }) {
  console.log("🧹 [DockerPrune] Starting docker system prune");
  console.log("🧹 [DockerPrune] Config:", JSON.stringify(config, null, 2));

  try {
    const cmd = config.all
      ? `docker system prune -af`
      : `docker system prune -f`;

    console.log("🧹 [DockerPrune] Executing:", cmd);
    console.log("🧹 [DockerPrune] All flag:", config.all || false);

    const { stdout } = await execAsync(cmd, { timeout: 60000 });
    console.log("🧹 [DockerPrune] Output length:", stdout.length);

    const result = {
      success: true,
      action: "prune_system",
      output: stdout,
    };

    console.log("✅ [DockerPrune] Success");
    console.log("✅ [DockerPrune] Output:", stdout);
    return result;
  } catch (err: any) {
    console.log("❌ [DockerPrune] Error:", err.message);

    const result = {
      success: false,
      action: "prune_system",
      error: err.message,
    };

    console.log(
      "❌ [DockerPrune] Error result:",
      JSON.stringify(result, null, 2),
    );
    return result;
  }
}
