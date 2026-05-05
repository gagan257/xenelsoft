export function weakEtagFromDate(v) {
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  if (!Number.isFinite(t)) return null;
  return `W/"${t}"`;
}

export function normalizeIfNoneMatch(header) {
  return String(header ?? '').trim();
}
