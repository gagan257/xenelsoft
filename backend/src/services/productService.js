import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { parseListParams } from '../utils/productQuery.js';
import { encodeProductCursor } from '../utils/productCursor.js';
import { weakEtagFromDate, normalizeIfNoneMatch } from '../utils/httpCache.js';
import { conflict } from '../utils/errors.js';

function duplicateKeyMessage(err) {
  if (err?.code === 11000) {
    const key = err.keyPattern ? Object.keys(err.keyPattern).join(',') : 'field';
    return `Duplicate value for unique ${key}.`;
  }
  return null;
}

function buildListMatch(p) {
  const clauses = [];

  if (p.useMongoTextSearch && p.q) {
    clauses.push({ $text: { $search: p.q } });
  }

  const eq = { ...p.filter };
  if (Object.keys(eq).length) {
    clauses.push(eq);
  }

  if (p.cursorDecoded) {
    const { t, id } = p.cursorDecoded;
    clauses.push({
      $or: [
        { createdAt: { $lt: new Date(t) } },
        { createdAt: new Date(t), _id: { $lt: new mongoose.Types.ObjectId(id) } },
      ],
    });
  }

  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function buildListSortStage(p) {
  if (p.useMongoTextSearch) {
    return { score: { $meta: 'textScore' }, [p.sortBy]: p.sortOrderNum };
  }
  return { [p.sortBy]: p.sortOrderNum };
}

export async function listProducts(rawQuery) {
  const params = parseListParams(rawQuery);
  const {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    useMongoTextSearch,
    summary,
    cursorDecoded,
    useCursorPagination,
  } = params;

  const sortOrderNum = sortOrder === 'asc' ? 1 : -1;
  const match = buildListMatch({
    filter: params.filter,
    q: params.q,
    useMongoTextSearch,
    cursorDecoded,
  });

  const sortStage = buildListSortStage({
    sortBy,
    sortOrderNum,
    useMongoTextSearch,
  });

  const projectStage = {
    $project: {
      __v: 0,
      ...(summary ? { description: 0 } : {}),
    },
  };

  const pipeline = [];

  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  if (useCursorPagination) {
    pipeline.push({ $sort: sortStage });
    pipeline.push({ $limit: limit + 1 });
    pipeline.push(projectStage);

    const rows = await Product.aggregate(pipeline);
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? encodeProductCursor(data[data.length - 1]) : null;

    return {
      data,
      meta: {
        mode: 'cursor',
        limit,
        hasMore,
        nextCursor,
        sortBy,
        sortOrder,
        summary,
      },
    };
  }

  pipeline.push({
    $facet: {
      data: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }, projectStage],
      totalCount: [{ $count: 'total' }],
    },
  });

  const [agg] = await Product.aggregate(pipeline);
  const data = agg?.data ?? [];
  const total = agg?.totalCount?.[0]?.total ?? 0;

  return {
    data,
    meta: {
      mode: 'page',
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      sortBy,
      sortOrder,
      summary,
    },
  };
}

export async function getProductById(id, ifNoneMatch) {
  const inm = normalizeIfNoneMatch(ifNoneMatch);
  if (inm) {
    const brief = await Product.findById(id).select('updatedAt').lean();
    if (!brief) {
      return { notFound: true };
    }
    const etag = weakEtagFromDate(brief.updatedAt);
    if (etag && inm === etag) {
      return { notModified: true, etag };
    }
  }

  const doc = await Product.findById(id).select('-__v').lean();
  if (!doc) {
    return { notFound: true };
  }
  const etag = weakEtagFromDate(doc.updatedAt);
  return { doc, etag };
}

export async function createProduct(body) {
  try {
    const doc = await Product.create(body);
    return doc.toObject({ versionKey: false });
  } catch (err) {
    const dup = duplicateKeyMessage(err);
    if (dup) {
      throw conflict(dup);
    }
    throw err;
  }
}

export async function updateProduct(id, set, unset = {}) {
  try {
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const doc = await Product.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .select('-__v')
      .lean();
    return doc;
  } catch (err) {
    const dup = duplicateKeyMessage(err);
    if (dup) {
      throw conflict(dup);
    }
    throw err;
  }
}

export async function deleteProduct(id) {
  const res = await Product.findByIdAndDelete(id).select('_id').lean();
  return Boolean(res);
}
