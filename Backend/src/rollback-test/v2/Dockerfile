# ─── V2 (BROKEN) ───────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN npm install express

COPY server.js .

EXPOSE 5000

# Label so your rollback tool can identify versions
LABEL version="v2.1.0" status="broken"

# ⚠️  AGENTOS_DB_SECRET is intentionally NOT set here.
# v2.1.0 added a hard requirement for it, but the deploy
# config was never updated — this is the bug.
CMD ["node", "server.js"]