# ---- Build Stage ----
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts && npm cache clean --force;

# Copy essential serverless files
COPY src ./src
COPY serverless.yml ./
COPY serverless.env.yml ./

# ---- Production Stage ----
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --include=prod --ignore-scripts && npm cache clean --force;

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built/app from build stage
COPY --from=build /app .

# Remove dev dependencies (if any)
RUN npm prune --include=prod
RUN npm install -g serverless serverless-offline

# Set environment variables (override at runtime as needed)
ENV NODE_ENV=production

# Expose the port serverless-offline (default 3000)
EXPOSE 3000

# Healthcheck (adjust path if needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the serverless offline server
CMD ["npm", "run", "start:offline"]
