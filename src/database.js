const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class LogDatabase {
  constructor(dataDir = '/data') {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'logs.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  initDatabase() {
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_source (source),
        INDEX idx_date (date),
        INDEX idx_level (level),
        INDEX idx_trace_id (trace_id),
        INDEX idx_created_at (created_at)
      )
    `);
  }

  insertLog(source, date, time, level, traceId, content) {
    const stmt = this.db.prepare(`
      INSERT INTO logs (source, date, time, level, trace_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(source, date, time, level, traceId, content);
  }

  insertLogBatch(logs) {
    const stmt = this.db.prepare(`
      INSERT INTO logs (source, date, time, level, trace_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((logs) => {
      for (const log of logs) {
        stmt.run(log.source, log.date, log.time, log.level, log.traceId, log.content);
      }
    });

    return insertMany(logs);
  }

  queryLogs(filters = {}) {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

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
      // SQLite doesn't have native regex, so we'll filter in memory
      query += ' AND content LIKE ?';
      params.push('%' + filters.contentRegex.replace(/[%_]/g, '\\$&') + '%');
    }

    query += ' ORDER BY date DESC, time DESC LIMIT ?';
    params.push(filters.limit || 1000);

    const stmt = this.db.prepare(query);
    let results = stmt.all(...params);

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

  executeCustomQuery(sql) {
    try {
      const stmt = this.db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all();
      } else {
        return stmt.run();
      }
    } catch (error) {
      throw new Error(`SQL execution error: ${error.message}`);
    }
  }

  deleteOldLogs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const stmt = this.db.prepare('DELETE FROM logs WHERE date < ?');
    return stmt.run(cutoffDateStr);
  }

  close() {
    this.db.close();
  }
}

module.exports = LogDatabase;
