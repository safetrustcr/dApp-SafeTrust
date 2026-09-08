FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install ALL dependencies (including devDeps — needed for tsx to run TypeScript)
# For production builds, switch to: npm run build && npm install --production
COPY package*.json ./
RUN npm install

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3002

CMD ["node", "--import", "tsx/esm", "src/index.ts"]