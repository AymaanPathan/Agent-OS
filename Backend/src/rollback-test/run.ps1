# ─────────────────────────────────────────────────
# AgentOS Rollback Test — Build & Run (PowerShell)
# ─────────────────────────────────────────────────

$CONTAINER_NAME = "agentos-backend"
$V1_IMAGE       = "agentos-backend:v1.0.0"
$V2_IMAGE       = "agentos-backend:v2.1.0"
$HOST_PORT      = 5000

Write-Host "============================================="
Write-Host "  🏗️  Building images..."
Write-Host "============================================="

# Build v1 (good)
Write-Host "→ Building $V1_IMAGE ..."
docker build -t $V1_IMAGE .\v1
Write-Host "✅ $V1_IMAGE built"
Write-Host ""

# Build v2 (broken)
Write-Host "→ Building $V2_IMAGE ..."
docker build -t $V2_IMAGE .\v2
Write-Host "✅ $V2_IMAGE built"
Write-Host ""

Write-Host "============================================="
Write-Host "  🚀 Deploying v2 (broken) as '$CONTAINER_NAME'..."
Write-Host "============================================="

# Kill existing container if any
docker rm -f $CONTAINER_NAME 2>$null

# Run v2 — it will crash almost immediately
docker run -d `
  --name $CONTAINER_NAME `
  -p "${HOST_PORT}:5000" `
  --restart=no `
  $V2_IMAGE

# Give it a moment to crash
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "============================================="
Write-Host "  📋 Container state after deploy:"
Write-Host "============================================="
docker ps -a --filter "name=$CONTAINER_NAME"

Write-Host ""
Write-Host "============================================="
Write-Host "  📜 Logs from the crashed container:"
Write-Host "============================================="
docker logs $CONTAINER_NAME

Write-Host ""
Write-Host "============================================="
Write-Host "  ✅ Setup complete. Test scenario is live."
Write-Host "============================================="
Write-Host ""
Write-Host "  Current state:"
Write-Host "    • Container '$CONTAINER_NAME' is STOPPED (v2.1.0 crashed on init)"
Write-Host "    • GET http://localhost:${HOST_PORT}/health → will fail"
Write-Host ""
Write-Host "  To manually rollback to v1 (what your tool should do):"
Write-Host ""
Write-Host "    docker rm -f $CONTAINER_NAME"
Write-Host "    docker run -d --name $CONTAINER_NAME -p ${HOST_PORT}:5000 $V1_IMAGE"
Write-Host ""
Write-Host "  After rollback, verify:"
Write-Host "    curl http://localhost:${HOST_PORT}/health"
Write-Host "============================================="