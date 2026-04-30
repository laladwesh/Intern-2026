import mongoose from "mongoose";

const sharedFileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
    unique: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  isPermanent: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: function() {
      return !this.isPermanent;
    },
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: String,
    default: "anonymous",
  },
  shareUrl: {
    type: String,
    required: true,
    unique: true,
  },
}, {
  timestamps: true,
});

// Index for automatic cleanup
sharedFileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SharedFile = mongoose.model("SharedFile", sharedFileSchema);

// Drop problematic shareUrl index if it exists
SharedFile.collection.dropIndex("shareUrl_1").catch(() => {
  // Index doesn't exist or already dropped, ignore error
});

export default SharedFile;
