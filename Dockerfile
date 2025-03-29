# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Show typescript version and files for debugging
RUN echo "TypeScript version:" && npx tsc --version
RUN echo "Source files:" && ls -la src/

# Build TypeScript code with verbose output
RUN npm run build
RUN echo "Build output:" && ls -la dist/

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist /app/dist
RUN echo "Copied dist files:" && ls -la /app/dist/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application with debugging in case of failure
CMD ["sh", "-c", "ls -la /app/dist && node dist/index.js"] 