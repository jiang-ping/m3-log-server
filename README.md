# M3 Log Server

[English](README.md) | [中文](README_zh.md)

A lightweight log collection and analysis service built with Node.js and TypeScript. This service collects logs from various applications (Node.js, Android, iOS, Web) via HTTP, stores them in SQLite with automatic rotation, and provides a web-based query interface.

## Features

- 📥 **Log Collection**: HTTP API for single and batch log submission
- 💾 **SQLite Storage**: Efficient storage in `/data` directory
- 🔄 **Automatic Rotation**: Configurable log retention (default: 7 days)
- 🔍 **Query Interface**: Web UI with multiple filter options
- 🎯 **Flexible Search**: Filter by source, level, time range, trace ID, content regex, or custom SQL
- 📦 **Multi-platform SDKs**: Ready-to-use SDKs for Node.js, Web, Android, and iOS
- 🐳 **Docker Support**: Easy deployment with Dockerfile
- 📘 **TypeScript**: Full TypeScript implementation with type safety

## Quick Start

### Using Docker (Recommended)

```bash
# Build the image
docker build -t m3-log-server .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v /path/to/data:/data \
  -e RETENTION_DAYS=7 \
  --name m3-log-server \
  m3-log-server
```

### Using Node.js

```bash
# Install dependencies
npm install

# Build TypeScript code
npm run build

# Start the server
npm start

# Or for development (builds and starts)
npm run dev

# Or with custom settings
PORT=8080 DATA_DIR=./data RETENTION_DAYS=14 npm start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `DATA_DIR`: Data directory for SQLite database (default: /data)
- `RETENTION_DAYS`: Number of days to keep logs (default: 7)

## Log Format

Each log entry follows this tab-separated format:

```
<date>\t<time>\t<level>\t<trace-id>\t<content>
```

- **date**: YYYY-MM-DD format
- **time**: HH:MM:SS format
- **level**: ERROR, WARN, INFO, DEBUG
- **trace-id**: Optional trace ID for request tracking
- **content**: Log message (newlines escaped as `\n`, backslashes as `\\`)

Example:
```
2026-01-18	10:30:45	INFO	trace-123	Application started successfully
```

## API Endpoints

### POST /api/log
Submit a single log entry.

**Request:**
```json
{
  "source": "my-app",
  "log": "2026-01-18\t10:30:45\tINFO\ttrace-123\tApplication started"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/logs
Submit multiple log entries in batch.

**Request:**
```json
{
  "source": "my-app",
  "logs": [
    "2026-01-18\t10:30:45\tINFO\ttrace-123\tApplication started",
    "2026-01-18\t10:30:46\tERROR\ttrace-123\tConnection failed"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

### GET /api/query
Query logs with filters.

**Query Parameters:**
- `source`: Filter by source application
- `level`: Filter by log level
- `traceId`: Filter by trace ID
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `contentRegex`: Regex pattern for content search
- `limit`: Maximum results (default: 1000)

**Example:**
```
GET /api/query?source=web-app&level=ERROR&startDate=2026-01-01&limit=100
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "source": "web-app",
      "date": "2026-01-18",
      "time": "10:30:45",
      "level": "ERROR",
      "trace_id": "trace-123",
      "content": "Connection failed",
      "created_at": "2026-01-18 10:30:45"
    }
  ],
  "count": 1
}
```

### POST /api/query/sql
Execute custom SQL query.

**Request:**
```json
{
  "sql": "SELECT * FROM logs WHERE level = 'ERROR' ORDER BY created_at DESC LIMIT 10"
}
```

**Response:**
```json
{
  "results": [...]
}
```

## SDK Usage

### Node.js SDK

The Node.js SDK is written in TypeScript and provides full type safety.

**TypeScript:**
```typescript
import M3Logger from './sdk/node/dist/m3-logger';

// Initialize logger
const logger = new M3Logger('http://localhost:3000', 'my-node-app');
logger.init(10); // Batch size of 10

// Log messages
logger.log('INFO', 'trace-123', 'Application started');
logger.log('ERROR', 'trace-124', 'Database connection failed');

// Manually flush (optional)
logger.flush();

// Close logger (flushes remaining logs)
logger.close();
```

**JavaScript:**
```javascript
const M3Logger = require('./sdk/node/dist/m3-logger').default;

// Initialize logger
const logger = new M3Logger('http://localhost:3000', 'my-node-app');
logger.init(10); // Batch size of 10

// Log messages
logger.log('INFO', 'trace-123', 'Application started');
logger.log('ERROR', 'trace-124', 'Database connection failed');

// Manually flush (optional)
logger.flush();

// Close logger (flushes remaining logs)
logger.close();
```

### Web SDK

```html
<script src="sdk/web/m3-logger.js"></script>
<script>
  // Initialize logger
  const logger = new M3Logger('http://localhost:3000', 'my-web-app');
  logger.init(10); // Batch size of 10

  // Log messages
  logger.log('INFO', null, 'Page loaded');
  logger.log('ERROR', 'trace-456', 'Form validation failed');

  // Logs are automatically flushed on page unload
</script>
```

### Android SDK

```java
// Initialize logger
M3Logger logger = new M3Logger("http://localhost:3000", "my-android-app");
logger.init(10); // Batch size of 10

// Log messages
logger.log("INFO", "trace-789", "Activity started");
logger.log("ERROR", "trace-790", "Network request failed");

// Close logger (flushes remaining logs)
logger.close();
```

### iOS SDK

```swift
// Initialize logger
let logger = M3Logger(endpoint: "http://localhost:3000", source: "my-ios-app")
logger.init(batchCount: 10)

// Log messages
logger.log(level: "INFO", traceId: "trace-101", content: "View loaded")
logger.log(level: "ERROR", traceId: "trace-102", content: "API call failed")

// Close logger (flushes remaining logs)
logger.close()
```

## Web Query Interface

Access the web interface at `http://localhost:3000/` to:

- Filter logs by source, level, trace ID, date range, and content
- Use regex patterns for content search
- Execute custom SQL queries
- View formatted log entries in a table

## Database Schema

The SQLite database contains a single `logs` table:

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  level TEXT NOT NULL,
  trace_id TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Indexes are created on: `source`, `date`, `level`, `trace_id`, `created_at`

## Log Retention

Logs are automatically cleaned up based on the `RETENTION_DAYS` setting:
- Cleanup runs every 24 hours
- Initial cleanup runs 5 seconds after server start
- Logs older than the retention period are permanently deleted

## Development

This project is written in TypeScript and compiled to JavaScript for execution.

### Project Structure

```
├── src/                    # TypeScript source files
│   ├── database.ts        # Database operations
│   ├── server.ts          # HTTP server implementation
│   └── index.ts           # Entry point
├── dist/                   # Compiled JavaScript (generated)
├── sdk/
│   └── node/              # Node.js SDK
│       ├── m3-logger.ts   # TypeScript source
│       └── dist/          # Compiled SDK (generated)
├── public/                # Static web UI files
└── tsconfig.json          # TypeScript configuration
```

### Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Start development server (builds and runs)
npm run dev

# Start production server
npm start
```

### Building the Node.js SDK

```bash
cd sdk/node
npx tsc
```

The compiled SDK will be in `sdk/node/dist/`.

## License

MIT