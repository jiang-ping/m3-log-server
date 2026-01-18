const LogServer = require('./server');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS) || 7;

const server = new LogServer(PORT, DATA_DIR, RETENTION_DAYS);
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.stop();
  process.exit(0);
});
