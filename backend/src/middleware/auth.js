import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(/\s+/);
  if (!token || scheme.toLowerCase() !== 'bearer') {
    throw unauthorized('Missing or invalid Authorization header.');
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (
      typeof payload.sub !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'user')
    ) {
      throw unauthorized('Invalid token payload.');
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw unauthorized('Invalid or expired token.');
  }
}

export function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) {
      throw unauthorized('Unauthenticated.');
    }
    if (!allowed.includes(req.user.role)) {
      throw forbidden('Forbidden: insufficient permissions.');
    }
    next();
  };
}
