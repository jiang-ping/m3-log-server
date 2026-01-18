# M3 Logger - Node.js SDK

Node.js SDK for M3 Log Server.

## Installation

Copy `m3-logger.js` to your project.

## Usage

```javascript
const M3Logger = require('./m3-logger');

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
