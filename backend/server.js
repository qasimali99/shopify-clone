const express = require('express');
const cors = require('cors');
const path = require('path');
const sendOTP = require('./utils/sendotp');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');
const Product = require('./models/Product');
const User = require('./models/user');
const Collection = require('./models/collections'); 
const { ObjectId } = require('mongodb');
const SalesChannel = require('./models/salesChannels');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const PORT = 5000;

// ===== MongoDB Connection =====
mongoose.connect('mongodb+srv://qasimali09929:MaLiK804@cluster0.pxft7ly.mongodb.net/shopify-clone?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== In-Memory OTP Store =====
const otpStore = {};
const takenNames = ["shopify", "mystore", "storehub", "qasimzone"];

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// =================== AUTH ROUTES ===================

app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ exists: false, message: "Email is required" });
  const exists = await User.findOne({ email });
  return res.json({ exists: !!exists });
});

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;
    await sendOTP(email, otp);
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

  const storedOtp = otpStore[email];
  if (!storedOtp) return res.status(400).json({ success: false, message: 'OTP not found or expired' });

  if (parseInt(otp) === storedOtp) {
    delete otpStore[email];
    return res.json({ success: true, message: 'OTP verified' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password, store } = req.body;
  if (!name || !email || !password || !store)
    return res.status(400).json({ success: false, error: 'Missing required fields' });

  try {
    const lowerStore = store.trim().toLowerCase();
    const existingStore = await User.findOne({ storeName: new RegExp(`^${lowerStore}$`, 'i') });
    if (existingStore || takenNames.includes(lowerStore)) {
      return res.status(400).json({ success: false, error: 'Store name already taken' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const user = new User({ name, email, password, storeName: store });
    await user.save();

    const token = Math.random().toString(36).substring(2);
    return res.json({ success: true, token });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(400).json({ success: false, error: 'Invalid email or password' });

    const token = Math.random().toString(36).substring(2);
    return res.json({ success: true, token, name: user.name, email: user.email });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ success: false, message: "Missing email or new password" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/check-store-name', async (req, res) => {
  const { storeName } = req.body;
  if (!storeName)
    return res.status(400).json({ available: false, message: "Store name is required" });

  const lower = storeName.trim().toLowerCase();
  const takenSet = new Set(takenNames.map(n => n.toLowerCase()));

  try {
    const user = await User.findOne({ storeName: new RegExp(`^${storeName}$`, 'i') });
    if (user || takenSet.has(lower)) {
      return res.json({
        available: false,
        suggestions: [`${lower}123`, `${lower}_store`, `the${lower}`]
      });
    }

    return res.json({ available: true });
  } catch (err) {
    return res.status(500).json({ available: false, message: "Server error" });
  }
});

// =================== PRODUCT ROUTES ===================

// Create Product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save product' });
  }
});

// Get product by ID (with email check)
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  try {
    const product = await Product.findOne({ _id: id, userEmail: email });
    if (!product)
      return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });

    res.json(product);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
});

// ✅ GET all products for a specific user
app.get('/api/products', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const products = await Product.find({ userEmail: email });
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// Update product by ID (with email check)
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  try {
    const product = await Product.findOneAndUpdate(
      { _id: id, userEmail: email },
      req.body,
      { new: true }
    );
    if (!product)
      return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

// Delete product (only if it belongs to user)
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  try {
    const result = await Product.findOneAndDelete({ _id: id, userEmail: email });
    if (!result)
      return res.status(404).json({ success: false, message: 'Not found or unauthorized' });

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// ====== COLLECTION ROUTES ======

// POST /api/collections - Save a collection
app.post('/api/collections', async (req, res) => {
  try {
    const collection = new Collection(req.body);
    await collection.save();
    res.status(201).json({ success: true, message: "Collection saved" });
  } catch (err) {
    console.error("Error saving collection:", err);
    res.status(500).json({ success: false, message: "Failed to save collection" });
  }
});

// GET /api/collections?email=user@example.com - Fetch all collections of user
app.get('/api/collections', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const collections = await Collection.find({ email }).sort({ createdAt: -1 });
    res.json(collections);
  } catch (err) {
    console.error("Error fetching collections:", err);
    res.status(500).json({ success: false, message: "Failed to fetch collections" });
  }
});

// ✅ GET single collection by ID
app.get('/api/collections/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  if (!id || !email) {
    return res.status(400).json({ success: false, message: "Missing ID or email" });
  }

  try {
    const collection = await Collection.findOne({ _id: new ObjectId(id), email });

    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found or unauthorized" });
    }

    res.json(collection);
  } catch (err) {
    console.error("Error fetching collection:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/collections/:id - Delete a collection
app.delete("/api/collections/:id", async (req, res) => {
  const email = req.query.email;
  const id = req.params.id;

  try {
    const result = await Collection.findOneAndDelete({
      _id: id,
      email: email
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Collection not found or unauthorized" });
    }

    res.json({ success: true, message: "Collection deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ===== THEME ROUTES =====

// Set active theme for user
app.post('/api/active-theme', async (req, res) => {
  const { email, theme } = req.body;
  if (!email || !theme) {
    return res.status(400).json({ success: false, message: 'Missing email or theme' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { activeTheme: theme },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Theme updated', activeTheme: user.activeTheme });
  } catch (err) {
    console.error('Theme update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get active theme by email
app.get('/api/active-theme', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, theme: user.activeTheme || 'stylish-main' });
  } catch (err) {
    console.error('Theme fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/active-theme/:store', async (req, res) => {
  const store = req.params.store;

  try {
    const user = await User.findOne({ storeName: store });

    if (!user) {
      return res.json({ theme: 'stylish-main' }); // fallback default
    }

    res.json({ theme: user.activeTheme || 'stylish-main' });
  } catch (err) {
    console.error('Get theme error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save active theme for a store/user (using DB now)
// Update by store name
app.post('/api/store-theme', async (req, res) => {
  const { store, theme } = req.body;

  if (!store || !theme) {
    return res.status(400).json({ error: 'store and theme required' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { storeName: store },
      { activeTheme: theme },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User/store not found' });

    res.status(200).json({ message: 'Theme updated', theme: user.activeTheme });
  } catch (err) {
    console.error('Theme update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SALES CHANNEL ROUTES =====

// Add new sales channel
app.post('/api/sales-channels', async (req, res) => {
  try {
    const channel = new SalesChannel(req.body);
    await channel.save();
    res.status(201).json({ success: true, message: "Sales channel saved", channel });
  } catch (err) {
    console.error("Error saving sales channel:", err);
    res.status(500).json({ success: false, message: "Failed to save sales channel" });
  }
});

// Get all sales channels by email
app.get('/api/sales-channels', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  try {
    const channels = await SalesChannel.find({ email }).sort({ createdAt: -1 });
    res.json(channels);
  } catch (err) {
    console.error("Error fetching sales channels:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sales channels" });
  }
});

// Delete sales channel
app.delete('/api/sales-channels/:id', async (req, res) => {
  const { email } = req.query;
  const { id } = req.params;

  try {
    const result = await SalesChannel.findOneAndDelete({ _id: id, email });
    if (!result) return res.status(404).json({ success: false, message: "Not found or unauthorized" });

    res.json({ success: true, message: "Sales channel deleted" });
  } catch (err) {
    console.error("Delete sales channel error:", err);
    res.status(500).json({ success: false, message: "Failed to delete sales channel" });
  }
});

// =================== DASHBOARD + SOCKET.IO ===================

let liveVisitors = 0;

io.on('connection', (socket) => {
  liveVisitors++;
  io.emit('visitorCount', liveVisitors);

  socket.on('disconnect', () => {
    liveVisitors--;
    io.emit('visitorCount', liveVisitors);
  });
});

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    res.json({
      totalOrders: 132,
      revenue: 8970,
      products: productCount,
      reviews: 4.7
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load dashboard stats" });
  }
});

// =================== START SERVER ===================
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
}); 