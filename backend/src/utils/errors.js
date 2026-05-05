export class AppError extends Error {
  constructor(status, message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function httpError(status, message, code) {
  return new AppError(status, message, code);
}

export function badRequest(message, code = 'BAD_REQUEST') {
  return httpError(400, message, code);
}

export function unauthorized(message = 'Unauthorized.', code = 'UNAUTHORIZED') {
  return httpError(401, message, code);
}

export function forbidden(message = 'Forbidden.', code = 'FORBIDDEN') {
  return httpError(403, message, code);
}

export function notFound(message, code = 'NOT_FOUND') {
  return httpError(404, message, code);
}

export function conflict(message, code = 'CONFLICT') {
  return httpError(409, message, code);
}
