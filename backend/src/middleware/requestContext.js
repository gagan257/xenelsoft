import { randomUUID } from 'node:crypto';

export function attachRequestContext(req, res, next) {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  next();
}
