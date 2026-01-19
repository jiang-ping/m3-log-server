/**
 * M3 Log Server SDK for Node.js
 * 
 * Usage:
 *   import M3Logger from './m3-logger';
 *   const logger = new M3Logger('http://localhost:3000', 'my-app');
 *   logger.init(10); // batch size of 10
 *   logger.log('INFO', 'trace-123', 'Application started');
 */

import * as http from 'http';
import * as https from 'https';

class M3Logger {
  private endpoint: string;
  private source: string;
  private batchCount: number;
  private buffer: string[];
  private autoFlushTimer: NodeJS.Timeout | null;

  constructor(endpoint: string, source: string = 'node-app') {
    this.endpoint = endpoint;
    this.source = source;
    this.batchCount = 1;
    this.buffer = [];
    this.autoFlushTimer = null;
  }

  /**
   * Initialize the logger
   * @param batchCount - Number of logs to batch before sending (default: 1)
   */
  init(batchCount: number = 1): void {
    this.batchCount = batchCount;
    
    // Auto-flush every 5 seconds if there are buffered logs
    this.autoFlushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, 5000);
  }

  /**
   * Log a message
   * @param level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param traceId - Trace ID for tracking
   * @param content - Log content
   */
  log(level: string, traceId: string | null, content: string): void {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    // Escape content: newlines to \n, backslashes to \\
    const escapedContent = content
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
  flush(): void {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    const data = JSON.stringify({
      source: this.source,
      logs: logs
    });

    const urlObj = new URL(`${this.endpoint}/api/logs`);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = protocol.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('Failed to send logs:', responseBody);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error sending logs:', error.message);
      // Re-add logs to buffer on error
      this.buffer = logs.concat(this.buffer);
    });

    req.write(data);
    req.end();
  }

  /**
   * Close the logger and flush remaining logs
   */
  close(): void {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
    }
    this.flush();
  }
}

export default M3Logger;
