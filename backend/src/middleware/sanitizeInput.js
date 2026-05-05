function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function hasDangerousKey(key) {
  return (
    key.startsWith('$') ||
    key.includes('.') ||
    key === '__proto__' ||
    key === 'prototype' ||
    key === 'constructor'
  );
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (hasDangerousKey(k)) continue;
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}
