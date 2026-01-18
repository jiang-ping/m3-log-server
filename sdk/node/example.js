const M3Logger = require('./m3-logger');

// Initialize logger
const logger = new M3Logger('http://localhost:3000', 'example-node-app');
logger.init(5); // Send logs in batches of 5

// Log some examples
logger.log('INFO', null, 'Application started');
logger.log('DEBUG', 'trace-001', 'Connecting to database');
logger.log('INFO', 'trace-001', 'Database connected successfully');
logger.log('WARN', 'trace-002', 'High memory usage detected');
logger.log('ERROR', 'trace-003', 'Failed to process request\nStack trace: ...');

// Simulate some work
setTimeout(() => {
  logger.log('INFO', null, 'Task completed');
  
  // Close logger and flush remaining logs
  logger.close();
  
  console.log('Logs sent to M3 Log Server');
}, 2000);
