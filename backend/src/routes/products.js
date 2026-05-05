import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { MAX_LIMIT, isValidObjectId } from '../utils/productQuery.js';
import { badRequest, notFound } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService.js';

const router = Router();

router.use(authenticate);

function parseCreateBody(body) {
  const { name, sku, description, price, category, stock, isActive } = body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('name is required.');
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    throw badRequest('price must be a non-negative number.');
  }
  const out = {
    name: name.trim().slice(0, 256),
    price: Number(price),
  };
  if (typeof description === 'string') out.description = description.slice(0, 8000);
  if (typeof category === 'string' && category.trim()) out.category = category.trim().slice(0, 128);
  if (typeof sku === 'string' && sku.trim()) out.sku = sku.trim().slice(0, 128);
  if (stock !== undefined) {
    const s = Number(stock);
    if (!Number.isInteger(s) || s < 0) {
      throw badRequest('stock must be a non-negative integer.');
    }
    out.stock = s;
  }
  if (typeof isActive === 'boolean') out.isActive = isActive;
  return out;
}

function parsePatchBody(body) {
  const { name, sku, description, price, category, stock, isActive } = body ?? {};
  const set = {};
  const unset = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw badRequest('name must be a non-empty string.');
    }
    set.name = name.trim().slice(0, 256);
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw badRequest('description must be a string.');
    }
    if (typeof description === 'string') set.description = description.slice(0, 8000);
  }
  if (category !== undefined) {
    if (typeof category !== 'string') {
      throw badRequest('category must be a string.');
    }
    set.category = category.trim().slice(0, 128);
  }
  if (sku !== undefined) {
    if (sku === null || (typeof sku === 'string' && !sku.trim())) {
      unset.sku = '';
    } else if (typeof sku === 'string') {
      set.sku = sku.trim().slice(0, 128);
    } else {
      throw badRequest('sku must be a string or null.');
    }
  }
  if (price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) {
      throw badRequest('price must be a non-negative number.');
    }
    set.price = p;
  }
  if (stock !== undefined) {
    const s = Number(stock);
    if (!Number.isInteger(s) || s < 0) {
      throw badRequest('stock must be a non-negative integer.');
    }
    set.stock = s;
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      throw badRequest('isActive must be a boolean.');
    }
    set.isActive = isActive;
  }

  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    throw badRequest('No valid fields to update.');
  }
  return { set, unset };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listProducts(req.query);
    res.json(result);
  }),
);

router.get(
  '/meta',
  (_req, res) => {
    res.json({
      maxLimit: MAX_LIMIT,
      sortFields: ['createdAt', 'updatedAt', 'price', 'name', 'stock'],
      filters: ['category', 'sku', 'minPrice', 'maxPrice', 'isActive', 'q'],
      pagination: {
        page: 'Offset mode (default). Single DB round-trip via $facet (rows + total).',
        cursor:
          'Keyset mode: pass cursor=<token> requires sortBy=createdAt & sortDesc (default). Avoids skip+COUNT for deep pages.',
        limit: `Max ${MAX_LIMIT}`,
        summary:
          'summary=true strips description from list payload (smaller JSON for read-heavy workloads).',
      },
      caching:
        'GET /products/:id supports If-None-Match weak ETags (cheap updatedAt probe when client sends etag). gzip enabled globally.',
      note: 'q uses MongoDB $text search (text index). Compound index aids default createdAt/id ordering.',
    });
  },
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw badRequest('Invalid product id.');
    }

    const result = await getProductById(id, req.get('if-none-match'));
    if (result.notFound) {
      throw notFound('Product not found.');
    }
    if (result.notModified) {
      if (result.etag) res.set('ETag', result.etag);
      return res.status(304).end();
    }
    if (result.etag) res.set('ETag', result.etag);
    res.json(result.doc);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseCreateBody(req.body);
    const product = await createProduct(payload);
    res.status(201).json(product);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw badRequest('Invalid product id.');
    }
    const patch = parsePatchBody(req.body);
    const product = await updateProduct(id, patch.set, patch.unset);
    if (!product) {
      throw notFound('Product not found.');
    }
    res.json(product);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw badRequest('Invalid product id.');
    }
    const ok = await deleteProduct(id);
    if (!ok) {
      throw notFound('Product not found.');
    }
    res.status(204).send();
  }),
);

export default router;
