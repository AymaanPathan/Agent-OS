# ─── V1 (GOOD) ────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Only dependency is express
RUN npm install express

COPY server.js .

EXPOSE 5000

# Label so you can filter/find this image easily
LABEL version="v1.0.0" status="stable"

CMD ["node", "server.js"]