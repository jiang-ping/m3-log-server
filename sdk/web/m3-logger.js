/**
 * M3 Log Server SDK for Web (JavaScript)
 * 
 * Usage:
 *   <script src="m3-logger.js"></script>
 *   <script>
 *     const logger = new M3Logger('http://localhost:3000', 'web-app');
 *     logger.init(10); // batch size of 10
 *     logger.log('INFO', 'trace-123', 'Page loaded');
 *   </script>
 */

class M3Logger {
  constructor(endpoint, source = 'web-app') {
    this.endpoint = endpoint;
    this.source = source;
    this.batchCount = 1;
    this.buffer = [];
    this.autoFlushTimer = null;
  }

  /**
   * Initialize the logger
   * @param {number} batchCount - Number of logs to batch before sending (default: 1)
   */
  init(batchCount = 1) {
    this.batchCount = batchCount;
    
    // Auto-flush every 5 seconds if there are buffered logs
    this.autoFlushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, 5000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Log a message
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param {string} traceId - Trace ID for tracking
   * @param {string} content - Log content
   */
  log(level, traceId, content) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    // Escape content: newlines to \n, backslashes to \\
    const escapedContent = String(content)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n');

    const logLine = `${date}\t${time}\t${level}\t${traceId || ''}\t${escapedContent}`;

    this.buffer.push(logLine);

    if (this.buffer.length >= this.batchCount) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to server
   */
  flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    const data = {
      source: this.source,
      logs: logs
    };

    fetch(`${this.endpoint}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      keepalive: true // Important for beforeunload
    }).catch(error => {
      console.error('Failed to send logs:', error);
      // Re-add logs to buffer on error
      this.buffer = logs.concat(this.buffer);
    });
  }

  /**
   * Close the logger and flush remaining logs
   */
  close() {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
    }
    this.flush();
  }
}

// Support both browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = M3Logger;
}
