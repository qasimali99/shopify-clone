const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  originalPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, required: true },
  currency: { type: String, default: 'PKR' },

  category: String,
  subcategory: String,

  colors: [String],
  sizes: [String],
  materials: [String],
  tags: [String],

  trackInventory: { type: Boolean, default: false },
  allowOOS: { type: Boolean, default: false },

  barcode: String,
  sku: String,

  weight: { type: Number, default: 0 },
  weightUnit: { type: String, default: 'Grams' },

  availableQty: { type: Number, default: 0 },
  onHandQty: { type: Number, default: 0 },

  inventoryLocations: [String], // e.g., ["Warehouse - 20 pcs"]
  media: [String], // image/video URLs

  vendor: String,
  status: { type: String, default: 'Active' },

 userEmail: { type: String, required: true }, // ✅ Add this line to link product with user
 
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
