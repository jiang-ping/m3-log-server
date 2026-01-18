# M3 Logger - iOS SDK

iOS SDK for M3 Log Server (Swift).

## Installation

Copy `M3Logger.swift` to your Xcode project.

## Usage

```swift
import Foundation

// Initialize logger
let logger = M3Logger(endpoint: "http://localhost:3000", source: "my-ios-app")
logger.init(batchCount: 10)

// Log messages
logger.log(level: "INFO", traceId: nil, content: "View loaded")
logger.log(level: "ERROR", traceId: "trace-123", content: "API request failed")

// Manually flush (optional)
logger.flush()

// Close logger when done
logger.close()
```

## API

### `init(endpoint: String, source: String = "ios-app")`
Creates a new logger instance.
- `endpoint`: M3 Log Server URL
- `source`: Application name/identifier (default: "ios-app")

### `init(batchCount: Int = 1)`
Initializes the logger with batching.
- `batchCount`: Number of logs to buffer before sending (default: 1)

### `log(level: String, traceId: String?, content: String)`
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
- **Thread-safe**: NSLock for concurrent access
- **Background sending**: Network requests are made asynchronously
- **Error handling**: Failed requests are retried by re-adding to buffer
- **Memory management**: Automatic cleanup in deinit

## Best Practices

- Initialize the logger in AppDelegate
- Store logger as a singleton for app-wide access
- Close the logger in `applicationWillTerminate`
- Use appropriate log levels (ERROR, WARN, INFO, DEBUG)
- Include trace IDs for tracking related log entries

## Example

```swift
class AppDelegate: UIResponder, UIApplicationDelegate {
    var logger: M3Logger!
    
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize logger
        logger = M3Logger(endpoint: "http://your-server:3000", source: "my-ios-app")
        logger.init(batchCount: 10)
        
        logger.log(level: "INFO", traceId: nil, content: "App launched")
        
        return true
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        logger.close()
    }
}
```
