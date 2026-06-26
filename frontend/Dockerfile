# ──────────────────────────────────────────────
# TaskSphere — Frontend Dockerfile
# Next.js 16 (dev server)
# ──────────────────────────────────────────────

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package*.json .
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
