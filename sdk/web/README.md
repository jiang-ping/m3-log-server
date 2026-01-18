# M3 Logger - Web SDK

JavaScript SDK for M3 Log Server (browser environment).

## Installation

Include the script in your HTML:

```html
<script src="m3-logger.js"></script>
```

## Usage

```javascript
// Initialize logger
const logger = new M3Logger('http://localhost:3000', 'my-web-app');
logger.init(10); // Batch size of 10

// Log messages
logger.log('INFO', null, 'Page loaded');
logger.log('ERROR', 'trace-123', 'Form validation failed');

// Manually flush (optional)
logger.flush();
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
- **Page unload handling**: Logs are automatically flushed when page unloads
- **Fetch API**: Uses modern Fetch API with keepalive for reliability
- **Error handling**: Failed requests are retried by re-adding to buffer

## Example

See `example.html` for a complete example.
