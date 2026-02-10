#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# AgentOS Rollback Test — Build & Run
# ─────────────────────────────────────────────────
set -e

CONTAINER_NAME="agentos-backend"
V1_IMAGE="agentos-backend:v1.0.0"
V2_IMAGE="agentos-backend:v2.1.0"
HOST_PORT=5000

echo "============================================="
echo "  🏗️  Building images..."
echo "============================================="

# Build v1 (good)
echo "→ Building $V1_IMAGE ..."
docker build -t "$V1_IMAGE" ./v1
echo "✅ $V1_IMAGE built"

# Build v2 (broken)
echo "→ Building $V2_IMAGE ..."
docker build -t "$V2_IMAGE" ./v2
echo "✅ $V2_IMAGE built"

echo ""
echo "============================================="
echo "  🚀 Deploying v2 (broken) as '$CONTAINER_NAME'..."
echo "============================================="

# Kill existing container if any
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Run v2 — it will crash almost immediately
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$HOST_PORT:5000" \
  --restart=no \
  "$V2_IMAGE"

# Give it a moment to crash
sleep 2

echo ""
echo "============================================="
echo "  📋 Container state after deploy:"
echo "============================================="
docker ps -a --filter "name=$CONTAINER_NAME" --format "  Name: {{.Names}}  |  Image: {{.Image}}  |  Status: {{.Status}}"

echo ""
echo "============================================="
echo "  📜 Logs from the crashed container:"
echo "============================================="
docker logs "$CONTAINER_NAME" 2>&1 | sed 's/^/  /'

echo ""
echo "============================================="
echo "  ✅ Setup complete. Test scenario is live."
echo "============================================="
echo ""
echo "  Current state:"
echo "    • Container '$CONTAINER_NAME' is STOPPED (v2.1.0 crashed on init)"
echo "    • GET http://localhost:$HOST_PORT/health → will fail (nothing listening)"
echo ""
echo "  To manually rollback to v1 (what your tool should do):"
echo ""
echo "    docker rm -f $CONTAINER_NAME"
echo "    docker run -d --name $CONTAINER_NAME -p $HOST_PORT:5000 $V1_IMAGE"
echo ""
echo "  After rollback, verify:"
echo "    curl http://localhost:$HOST_PORT/health"
echo "    → should return {\"status\":\"ok\", \"version\":\"v1.0.0\", ...}"
echo ""
echo "  To re-break it (redeploy v2):"
echo "    docker rm -f $CONTAINER_NAME"
echo "    docker run -d --name $CONTAINER_NAME -p $HOST_PORT:5000 $V2_IMAGE"
echo "============================================="