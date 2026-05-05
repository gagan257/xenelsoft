import mongoose from 'mongoose';
import { decodeProductCursor } from './productCursor.js';
import { badRequest } from './errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

const SORT_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'price', 'name', 'stock']);

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return n;
}

function clampLimit(raw) {
  const n = parsePositiveInt(raw, DEFAULT_LIMIT);
  return Math.min(n, MAX_LIMIT);
}

export function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.isValidObjectId(id);
}

export function parseListParams(query) {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const limit = clampLimit(query.limit);

  const sortByRaw = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt';
  const sortBy = SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const summary =
    query.summary === '1' || query.summary === 'true' || query.summary === 'yes';

  const cursorRaw = typeof query.cursor === 'string' ? query.cursor.trim() : '';
  let useCursorPagination = false;
  let cursorDecoded = null;

  if (cursorRaw) {
    cursorDecoded = decodeProductCursor(cursorRaw);
    if (!cursorDecoded) {
      throw badRequest('Invalid cursor.');
    }
    if (sortBy !== 'createdAt' || sortOrder !== -1) {
      throw badRequest(
        'Cursor pagination requires sortBy=createdAt and sortOrder=desc (the default).',
      );
    }
    useCursorPagination = true;
  }

  const skip = useCursorPagination ? 0 : (page - 1) * limit;

  const filter = {};

  if (typeof query.category === 'string' && query.category.trim()) {
    filter.category = query.category.trim();
  }

  if (typeof query.sku === 'string' && query.sku.trim()) {
    filter.sku = query.sku.trim();
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const min = query.minPrice === undefined || query.minPrice === '' ? undefined : Number(query.minPrice);
    const max = query.maxPrice === undefined || query.maxPrice === '' ? undefined : Number(query.maxPrice);
    if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
      throw badRequest('Invalid minPrice.');
    }
    if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
      throw badRequest('Invalid maxPrice.');
    }
    if (min !== undefined || max !== undefined) {
      filter.price = {};
      if (min !== undefined) filter.price.$gte = min;
      if (max !== undefined) filter.price.$lte = max;
    }
  }

  if (typeof query.isActive === 'string' && query.isActive.trim() !== '') {
    const v = query.isActive.trim().toLowerCase();
    if (v !== 'true' && v !== 'false') {
      throw badRequest('Invalid isActive. Use true or false.');
    }
    filter.isActive = v === 'true';
  }

  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 128) : '';
  const useMongoTextSearch = q.length > 0;

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    sort,
    filter,
    q,
    useMongoTextSearch,
    summary,
    cursorDecoded,
    useCursorPagination,
  };
}

export { SORT_FIELDS };
