import { config } from './config/env.js';
import app from './app.js';
import { connectDb } from './db/connect.js';
import { ensureBootstrapAdmin } from './bootstrap.js';
import { logger } from './utils/logger.js';

await connectDb();
await ensureBootstrapAdmin();

app.listen(config.port, () => {
  logger.info('server_started', { port: config.port });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error: error.message, stack: error.stack });
});
