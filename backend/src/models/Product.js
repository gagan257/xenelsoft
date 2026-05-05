import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: 'general' },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ createdAt: -1, _id: -1 });
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

export const Product = mongoose.model('Product', productSchema);
