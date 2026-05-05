import { config } from './config/env.js';
import { hashPassword } from './utils/password.js';
import { User } from './models/User.js';

export async function ensureBootstrapAdmin() {
  const email = config.bootstrapAdminEmail;
  const password = config.bootstrapAdminPassword;
  if (!email || !password) return;

  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await User.create({ email, passwordHash, role: 'admin' });
  console.log(`Bootstrap admin created: ${email}`);
}
