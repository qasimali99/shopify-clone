const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  email: String,
  title: String,
  description: String,
  status: String,
  seo: {
    title: String,
    desc: String,
    handle: String
  },
  coverImage: String, // Base64 or URL
  products: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Collection', collectionSchema);
