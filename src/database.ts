import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

interface LogEntry {
  source: string;
  date: string;
  time: string;
  level: string;
  traceId: string | null;
  content: string;
}

interface QueryFilters {
  source?: string;
  level?: string;
  traceId?: string;
  startDate?: string;
  endDate?: string;
  contentRegex?: string;
  limit?: number;
}

interface LogRecord {
  id: number;
  source: string;
  date: string;
  time: string;
  level: string;
  trace_id: string | null;
  content: string;
  created_at: string;
}

class LogDatabase {
  private db: Database.Database;

  constructor(dataDir: string = '/data') {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'logs.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  public getDatabaseName(): string {
    return this.db.name;
  }

  private initDatabase(): void {
    // Create logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        level TEXT NOT NULL,
        trace_id TEXT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_source ON logs(source)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_date ON logs(date)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_level ON logs(level)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_trace_id ON logs(trace_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON logs(created_at)`);
  }

  public insertLog(source: string, date: string, time: string, level: string, traceId: string | null, content: string): Database.RunResult {
    const stmt = this.db.prepare(`
      INSERT INTO logs (source, date, time, level, trace_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(source, date, time, level, traceId, content);
  }

  public insertLogBatch(logs: LogEntry[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO logs (source, date, time, level, trace_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((logs: LogEntry[]) => {
      for (const log of logs) {
        stmt.run(log.source, log.date, log.time, log.level, log.traceId, log.content);
      }
    });

    insertMany(logs);
  }

  public queryLogs(filters: QueryFilters = {}): LogRecord[] {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    if (filters.level) {
      query += ' AND level = ?';
      params.push(filters.level);
    }

    if (filters.traceId) {
      query += ' AND trace_id = ?';
      params.push(filters.traceId);
    }

    if (filters.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }

    if (filters.contentRegex) {
      // SQLite doesn't have native regex, so we use LIKE for initial filtering
      // and then apply regex in memory. This is safe from SQL injection because
      // we use parameterized queries with escaped LIKE wildcards.
      query += ' AND content LIKE ?';
      // Escape backslashes first, then % and _ for LIKE pattern matching
      const escaped = filters.contentRegex
        .replace(/\\/g, '\\\\')
        .replace(/[%_]/g, '\\$&');
      params.push('%' + escaped + '%');
    }

    query += ' ORDER BY date DESC, time DESC LIMIT ?';
    params.push(filters.limit || 1000);

    const stmt = this.db.prepare(query);
    let results = stmt.all(...params) as LogRecord[];

    // Apply regex filter if specified
    if (filters.contentRegex) {
      try {
        const regex = new RegExp(filters.contentRegex);
        results = results.filter(log => regex.test(log.content));
      } catch (e) {
        // Invalid regex, skip filtering
      }
    }

    return results;
  }

  public executeCustomQuery(sql: string): any {
    try {
      const stmt = this.db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all();
      } else {
        return stmt.run();
      }
    } catch (error) {
      throw new Error(`SQL execution error: ${(error as Error).message}`);
    }
  }

  public deleteOldLogs(daysToKeep: number = 7): Database.RunResult {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const stmt = this.db.prepare('DELETE FROM logs WHERE date < ?');
    return stmt.run(cutoffDateStr);
  }

  public close(): void {
    this.db.close();
  }
}

export default LogDatabase;
export { LogEntry, QueryFilters, LogRecord };
