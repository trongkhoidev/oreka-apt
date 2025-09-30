FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S indexer -u 1001

# Change ownership of the app directory
RUN chown -R indexer:nodejs /app
USER indexer

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const { Client } = require('pg'); const client = new Client({ connectionString: process.env.PG_URL }); client.connect().then(() => client.query('SELECT 1')).then(() => client.end()).then(() => process.exit(0)).catch(() => process.exit(1))"

# Start the indexer
CMD ["npm", "start"]
