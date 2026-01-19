# M3 Logger - Node.js SDK

Node.js SDK for M3 Log Server, written in TypeScript.

## Installation

1. Build the SDK:
   ```bash
   npx tsc
   ```

2. Copy the `dist` folder to your project.

## Usage

### TypeScript

```typescript
import M3Logger from './dist/m3-logger';

// Initialize logger with endpoint and source name
const logger = new M3Logger('http://localhost:3000', 'my-app');

// Set batch size (optional, default is 1)
logger.init(10);

// Log messages
logger.log('INFO', 'trace-id', 'Message content');
logger.log('ERROR', null, 'Error occurred');

// Manually flush buffered logs
logger.flush();

// Close logger (flushes remaining logs)
logger.close();
```

### JavaScript

```javascript
const M3Logger = require('./dist/m3-logger').default;

// Initialize logger with endpoint and source name
const logger = new M3Logger('http://localhost:3000', 'my-app');

// Set batch size (optional, default is 1)
logger.init(10);

// Log messages
logger.log('INFO', 'trace-id', 'Message content');
logger.log('ERROR', null, 'Error occurred');

// Manually flush buffered logs
logger.flush();

// Close logger (flushes remaining logs)
logger.close();
```

## API

### `new M3Logger(endpoint, source)`
Creates a new logger instance.
- `endpoint`: M3 Log Server URL
- `source`: Application name/identifier

### `init(batchCount)`
Initializes the logger with batching.
- `batchCount`: Number of logs to buffer before sending (default: 1)

### `log(level, traceId, content)`
Logs a message.
- `level`: Log level (ERROR, WARN, INFO, DEBUG)
- `traceId`: Trace ID for tracking (optional)
- `content`: Log message

### `flush()`
Immediately sends all buffered logs to the server.

### `close()`
Closes the logger and flushes remaining logs.

## Features

- **Automatic batching**: Logs are buffered and sent in batches
- **Auto-flush**: Buffered logs are automatically sent every 5 seconds
- **Error handling**: Failed requests are retried by re-adding to buffer
- **Escape handling**: Newlines and backslashes are properly escaped

## Example

See `example.js` for a complete example.
