const mongoose = require('mongoose');

const salesChannelsSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  onlineStore: { type: Boolean, default: false },
  facebook: { type: Boolean, default: false },
  instagram: { type: Boolean, default: false },
  amazon: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false }
});

module.exports = mongoose.model('SalesChannels', salesChannelsSchema);
