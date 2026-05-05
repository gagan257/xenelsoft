import mongoose from 'mongoose';

export function encodeProductCursor(doc) {
  if (!doc?.createdAt || doc._id == null) return null;
  const payload = JSON.stringify({
    t: new Date(doc.createdAt).getTime(),
    id: String(doc._id),
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeProductCursor(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const json = Buffer.from(raw.trim(), 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!mongoose.isValidObjectId(parsed.id) || typeof parsed.t !== 'number') return null;
    return { t: parsed.t, id: parsed.id };
  } catch {
    return null;
  }
}
