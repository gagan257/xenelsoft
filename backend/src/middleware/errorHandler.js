import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found.',
    requestId: req.requestId,
  });
}

function resolveStatusAndMessage(err) {
  if (err instanceof AppError) {
    return { status: err.status, message: err.message, code: err.code };
  }
  const status = Number(err?.status);
  if (Number.isInteger(status) && status >= 400 && status < 600) {
    return { status, message: err.message || 'Request failed.', code: err.code };
  }

  if (err?.name === 'ValidationError') {
    return { status: 400, message: 'Validation failed.', code: 'VALIDATION_ERROR' };
  }
  if (err?.name === 'CastError') {
    return { status: 400, message: 'Invalid resource identifier.', code: 'CAST_ERROR' };
  }
  if (err?.code === 11000) {
    return { status: 409, message: 'Duplicate value violates unique constraint.', code: 'DUPLICATE_KEY' };
  }
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, message: 'Uploaded file is too large.', code: 'FILE_TOO_LARGE' };
    }
    return { status: 400, message: err.message || 'Upload failed.', code: 'UPLOAD_ERROR' };
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { status: 400, message: 'Invalid JSON payload.', code: 'INVALID_JSON' };
  }
  return { status: 500, message: 'Internal server error.', code: 'INTERNAL_ERROR' };
}

export function errorHandler(err, req, res, _next) {
  const { status, message, code } = resolveStatusAndMessage(err);

  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    errorName: err?.name,
    errorMessage: err?.message,
    errorCode: code,
    stack: status === 500 ? err?.stack : undefined,
  });

  res.status(status).json({
    error: message,
    code,
    requestId: req.requestId,
  });
}
