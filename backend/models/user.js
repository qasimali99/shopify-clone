// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  storeName: { type: String, unique: true },
  activeTheme: {
    type: String,
    default: 'stylish-main'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
