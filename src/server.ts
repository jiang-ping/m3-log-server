import * as http from 'http';
import * as url from 'url';
import { ParsedUrlQuery } from 'querystring';
import * as path from 'path';
import * as fs from 'fs';
import LogDatabase, { LogEntry, QueryFilters } from './database';

class LogServer {
  private port: number;
  private retentionDays: number;
  private db: LogDatabase;
  private server: http.Server | null;

  constructor(port: number = 3000, dataDir: string = '/data', retentionDays: number = 7) {
    this.port = port;
    this.retentionDays = retentionDays;
    this.db = new LogDatabase(dataDir);
    this.server = null;

    // Schedule log cleanup daily
    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(() => {
      console.log('Running log cleanup...');
      const result = this.db.deleteOldLogs(this.retentionDays);
      console.log(`Deleted ${result.changes} old log entries`);
    }, 24 * 60 * 60 * 1000);

    // Run cleanup on startup
    setTimeout(() => {
      console.log('Running initial log cleanup...');
      const result = this.db.deleteOldLogs(this.retentionDays);
      console.log(`Deleted ${result.changes} old log entries`);
    }, 5000);
  }

  private parseLogLine(line: string, source: string): LogEntry {
    // Format: <date>\t<time>\t<level>\t<trace-id>\t<content>
    const parts = line.split('\t');
    if (parts.length < 5) {
      throw new Error('Invalid log format');
    }

    return {
      source,
      date: parts[0],
      time: parts[1],
      level: parts[2],
      traceId: parts[3] || null,
      content: parts[4].replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
    };
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // API endpoints
    if (pathname === '/api/log' && req.method === 'POST') {
      await this.handleLogSubmit(req, res);
    } else if (pathname === '/api/logs' && req.method === 'POST') {
      await this.handleBatchLogSubmit(req, res);
    } else if (pathname === '/api/query' && req.method === 'GET') {
      await this.handleQuery(req, res, parsedUrl.query);
    } else if (pathname === '/api/query/sql' && req.method === 'POST') {
      await this.handleCustomQuery(req, res);
    } else if (pathname === '/' || pathname === '/index.html') {
      this.serveStaticFile(res, 'public/index.html');
    } else {
      // Serve static files
      this.serveStaticFile(res, 'public' + pathname);
    }
  }

  private async handleLogSubmit(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const data = JSON.parse(body);

      const log = this.parseLogLine(data.log, data.source || 'unknown');
      this.db.insertLog(log.source, log.date, log.time, log.level, log.traceId, log.content);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private async handleBatchLogSubmit(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const data = JSON.parse(body);

      const logs = data.logs.map((logLine: string) => 
        this.parseLogLine(logLine, data.source || 'unknown')
      );

      this.db.insertLogBatch(logs);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: logs.length }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private async handleQuery(req: http.IncomingMessage, res: http.ServerResponse, query: ParsedUrlQuery): Promise<void> {
    try {
      const filters: QueryFilters = {
        source: query.source as string | undefined,
        level: query.level as string | undefined,
        traceId: query.traceId as string | undefined,
        startDate: query.startDate as string | undefined,
        endDate: query.endDate as string | undefined,
        contentRegex: query.contentRegex as string | undefined,
        limit: parseInt(query.limit as string) || 1000
      };

      const results = this.db.queryLogs(filters);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results, count: results.length }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private async handleCustomQuery(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const data = JSON.parse(body);

      const results = this.db.executeCustomQuery(data.sql);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private serveStaticFile(res: http.ServerResponse, filePath: string): void {
    const fullPath = path.join(__dirname, '..', filePath);

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(fullPath);
      const contentTypes: { [key: string]: string } = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      };

      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(data);
    });
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  public start(): void {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(err => {
        console.error('Request error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
    });

    this.server.listen(this.port, () => {
      console.log(`Log server running on port ${this.port}`);
      console.log(`Data directory: ${this.db.db.name}`);
      console.log(`Log retention: ${this.retentionDays} days`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
    this.db.close();
  }
}

export default LogServer;
