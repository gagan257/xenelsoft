import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';
import { attachRequestContext } from './middleware/requestContext.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const uploadDir = path.join(process.cwd(), 'uploads');
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(attachRequestContext);
app.use(sanitizeInput);
app.use('/uploads', express.static(uploadDir));

morgan.token('request-id', (req) => req.requestId || '-');
morgan.token('user-id', (req) => req.user?.id || '-');
app.use(
  morgan(':method :url :status :response-time ms req=:request-id user=:user-id', {
    stream: {
      write: (message) => logger.info('http_request', { line: message.trim() }),
    },
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
  },
});

app.use('/api', authLimiter, routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
