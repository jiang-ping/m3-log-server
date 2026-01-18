FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src/ ./src/
COPY public/ ./public/

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set default environment variables
ENV PORT=3000
ENV DATA_DIR=/data
ENV RETENTION_DAYS=7

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "src/index.js"]
