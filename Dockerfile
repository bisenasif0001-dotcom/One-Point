# Multi-stage Docker build for EROS / One Point Digital Services
FROM node:24.15.0-alpine AS build

WORKDIR /app

# Copy dependency mappings
COPY package*.json ./

# Install development dependencies
RUN npm ci

# Copy codebase
COPY . .

# Run production build/optimization if exists
# npm run build --if-present

# Production runner image stage
FROM node:24.15.0-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built package and package-lock
COPY --from=build /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy production runtime and public website
COPY --from=build /app/backend ./backend
COPY --from=build /app/assets ./assets
COPY --from=build /app/dashboard ./dashboard
COPY --from=build /app/*.html ./
COPY --from=build /app/robots.txt /app/sitemap.xml ./
COPY --from=build /app/server.js ./

# Create non-root system user for safety
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
