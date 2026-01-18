import Foundation

/**
 * M3 Log Server SDK for iOS
 *
 * Usage:
 *   let logger = M3Logger(endpoint: "http://localhost:3000", source: "ios-app")
 *   logger.init(batchCount: 10)
 *   logger.log(level: "INFO", traceId: "trace-123", content: "View loaded")
 */
public class M3Logger {
    private let endpoint: String
    private let source: String
    private var batchCount: Int = 1
    private var buffer: [String] = []
    private var autoFlushTimer: Timer?
    private let dateFormatter = DateFormatter()
    private let timeFormatter = DateFormatter()
    private let lock = NSLock()
    
    public init(endpoint: String, source: String = "ios-app") {
        self.endpoint = endpoint
        self.source = source
        
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        
        timeFormatter.dateFormat = "HH:mm:ss"
        timeFormatter.locale = Locale(identifier: "en_US_POSIX")
    }
    
    /**
     * Initialize the logger
     * - Parameter batchCount: Number of logs to batch before sending (default: 1)
     */
    public func `init`(batchCount: Int = 1) {
        self.batchCount = batchCount
        
        // Auto-flush every 5 seconds if there are buffered logs
        autoFlushTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.flushIfNeeded()
        }
    }
    
    /**
     * Log a message
     * - Parameters:
     *   - level: Log level (ERROR, WARN, INFO, DEBUG)
     *   - traceId: Trace ID for tracking
     *   - content: Log content
     */
    public func log(level: String, traceId: String?, content: String) {
        let now = Date()
        let date = dateFormatter.string(from: now)
        let time = timeFormatter.string(from: now)
        
        // Escape content: backslashes to \\, newlines to \n
        let escapedContent = content
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\n", with: "\\n")
        
        let logLine = "\(date)\t\(time)\t\(level)\t\(traceId ?? "")\t\(escapedContent)"
        
        lock.lock()
        buffer.append(logLine)
        let shouldFlush = buffer.count >= batchCount
        lock.unlock()
        
        if shouldFlush {
            flush()
        }
    }
    
    /**
     * Flush buffered logs to server
     */
    public func flush() {
        lock.lock()
        guard !buffer.isEmpty else {
            lock.unlock()
            return
        }
        let logs = buffer
        buffer.removeAll()
        lock.unlock()
        
        let payload: [String: Any] = [
            "source": source,
            "logs": logs
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let url = URL(string: "\(endpoint)/api/logs") else {
            // Re-add logs to buffer on error
            lock.lock()
            buffer.insert(contentsOf: logs, at: 0)
            lock.unlock()
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("Error sending logs: \(error.localizedDescription)")
                // Re-add logs to buffer on error
                self?.lock.lock()
                self?.buffer.insert(contentsOf: logs, at: 0)
                self?.lock.unlock()
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                print("Failed to send logs: HTTP \(httpResponse.statusCode)")
            }
        }
        
        task.resume()
    }
    
    /**
     * Close the logger and flush remaining logs
     */
    public func close() {
        autoFlushTimer?.invalidate()
        autoFlushTimer = nil
        flush()
    }
    
    private func flushIfNeeded() {
        lock.lock()
        let hasLogs = !buffer.isEmpty
        lock.unlock()
        
        if hasLogs {
            flush()
        }
    }
    
    deinit {
        close()
    }
}
