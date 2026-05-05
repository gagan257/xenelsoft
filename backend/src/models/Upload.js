import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    extension: { type: String, default: '' },
    urlPath: { type: String, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

uploadSchema.index({ createdAt: -1 });

export const Upload = mongoose.model('Upload', uploadSchema);
