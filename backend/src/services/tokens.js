import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAccessToken({ userId, role }) {
  return jwt.sign({ sub: userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
