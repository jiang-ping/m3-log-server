# M3 Logger - Android SDK

Android SDK for M3 Log Server.

## Installation

Copy `M3Logger.java` to your project: `app/src/main/java/com/m3/logger/M3Logger.java`

Add JSON dependency to your `build.gradle`:

```gradle
dependencies {
    implementation 'org.json:json:20210307'
}
```

Add internet permission to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

```java
import com.m3.logger.M3Logger;

// Initialize logger
M3Logger logger = new M3Logger("http://10.0.2.2:3000", "my-android-app");
logger.init(10); // Batch size of 10

// Log messages
logger.log("INFO", null, "Activity started");
logger.log("ERROR", "trace-123", "Network request failed");

// Manually flush (optional)
logger.flush();

// Close logger when done
logger.close();
```

**Note**: Use `10.0.2.2` instead of `localhost` when testing with Android emulator.

## API

### `M3Logger(String endpoint, String source)`
Creates a new logger instance.
- `endpoint`: M3 Log Server URL
- `source`: Application name/identifier

### `init(int batchCount)`
Initializes the logger with batching.
- `batchCount`: Number of logs to buffer before sending (default: 1)

### `log(String level, String traceId, String content)`
Logs a message.
- `level`: Log level (ERROR, WARN, INFO, DEBUG)
- `traceId`: Trace ID for tracking (optional, can be null)
- `content`: Log message

### `flush()`
Immediately sends all buffered logs to the server.

### `close()`
Closes the logger and flushes remaining logs.

## Features

- **Automatic batching**: Logs are buffered and sent in batches
- **Auto-flush**: Buffered logs are automatically sent every 5 seconds
- **Thread-safe**: Synchronization for concurrent access
- **Background sending**: Network requests are made in background threads
- **Error handling**: Failed requests are retried by re-adding to buffer

## Best Practices

- Initialize the logger in your Application class
- Close the logger in `onDestroy()` lifecycle methods
- Use appropriate log levels (ERROR, WARN, INFO, DEBUG)
- Include trace IDs for tracking related log entries
