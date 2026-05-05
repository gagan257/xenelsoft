import { badRequest } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidEmail(email) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw badRequest('Invalid email.');
  }
}

export function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw badRequest('Password must be at least 8 characters.');
  }
}
