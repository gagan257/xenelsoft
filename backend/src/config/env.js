import dotenv from 'dotenv';

dotenv.config();

function fatal(message) {
  console.error(message);
  process.exit(1);
}

function requireString(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === '') {
    fatal(`FATAL: Environment variable "${name}" is required. Set it in your .env file.`);
  }
  return String(v).trim();
}

const mongodbUri = requireString('MONGODB_URI');
const jwtSecret = requireString('JWT_SECRET');

const portRaw = process.env.PORT?.trim();
const port = portRaw ? Number(portRaw) : 3000;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fatal('FATAL: PORT must be an integer between 1 and 65535.');
}

const uploadMaxSizeRaw = process.env.UPLOAD_MAX_FILE_SIZE_MB?.trim();
const uploadMaxFileSizeMb = uploadMaxSizeRaw ? Number(uploadMaxSizeRaw) : 5;
if (!Number.isFinite(uploadMaxFileSizeMb) || uploadMaxFileSizeMb <= 0) {
  fatal('FATAL: UPLOAD_MAX_FILE_SIZE_MB must be a positive number.');
}

export const config = {
  port,
  mongodbUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  uploadMaxFileSizeBytes: Math.floor(uploadMaxFileSizeMb * 1024 * 1024),
  uploadBaseUrl: process.env.UPLOAD_BASE_URL?.trim() || '',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || '',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || '',
};
