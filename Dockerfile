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
RUN echo "Source structure:" && find src -type f | sort
RUN echo "tsconfig.json:" && cat tsconfig.json

# Clean any previous build artifacts
RUN rm -rf dist

# Build TypeScript code with verbose output
RUN npm run build
RUN echo "Build output:" && find dist -type f | sort

# Verify build output
RUN if [ ! -f "dist/index.js" ]; then \
      echo "ERROR: dist/index.js not found!"; \
      exit 1; \
    fi

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage (specifically to /app/dist/ with explicit source)
COPY --from=builder /app/dist/ /app/dist/
RUN echo "Copied dist files:" && find /app/dist -type f | sort

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"] 