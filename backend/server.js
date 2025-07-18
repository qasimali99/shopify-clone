// backend/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const sendOTP = require('./utils/sendotp');
require('dotenv').config();


// 🧠 Required for socket.io:
const http = require('http');

const app = express();
const server = http.createServer(app); // 👈 Create HTTP server
const { Server } = require('socket.io');
const io = new Server(server); // 👈 Attach socket.io to HTTP server

const PORT = 5000;

const otpStore = {};
const userStore = {}; // key: email, value: { name, password, storeName }

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// =================== ALL ROUTES BELOW (unchanged) ===================

// Check email route
app.post('/api/check-email', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ exists: false, message: "Email is required" });
  }

  const exists = !!userStore[email];
  return res.json({ exists });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

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

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const storedOtp = otpStore[email];
  if (!storedOtp) {
    return res.status(400).json({ success: false, message: 'OTP not found or expired' });
  }

  if (parseInt(otp) === storedOtp) {
    delete otpStore[email];
    return res.json({ success: true, message: 'OTP verified' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

// Signup
const takenNames = ["shopify", "mystore", "storehub", "qasimzone"];

app.post('/api/signup', (req, res) => {
  const { name, email, password, store } = req.body;

  if (!name || !email || !password || !store) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const lowerStore = store.trim().toLowerCase();
  const allTaken = new Set(takenNames.map(n => n.toLowerCase()));
  for (const user of Object.values(userStore)) {
    if (user.storeName) {
      allTaken.add(user.storeName.toLowerCase());
    }
  }

  if (allTaken.has(lowerStore)) {
    return res.status(400).json({
      success: false,
      error: 'Store name already taken. Please choose another one.'
    });
  }

  userStore[email] = { name, password, storeName: store };

  const token = Math.random().toString(36).substring(2);
  return res.json({ success: true, token });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const user = userStore[email];
  if (!user || user.password !== password) {
    return res.status(400).json({ success: false, error: 'Invalid email or password' });
  }

  const token = Math.random().toString(36).substring(2);
  return res.json({ success: true, token, name: user.name });
});

// Reset Password
app.post('/api/reset-password', (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing email or new password" });
  }

  const user = userStore[email];
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  user.password = newPassword;
  return res.json({ success: true, message: "Password reset successfully" });
});

// Store name availability check
app.post('/api/check-store-name', (req, res) => {
  const { storeName } = req.body;

  if (!storeName) {
    return res.status(400).json({ available: false, message: "Store name is required" });
  }

  const lower = storeName.trim().toLowerCase();
  const allTaken = new Set(takenNames.map(name => name.toLowerCase()));
  for (const user of Object.values(userStore)) {
    if (user.storeName) {
      allTaken.add(user.storeName.toLowerCase());
    }
  }

  if (allTaken.has(lower)) {
    return res.json({
      available: false,
      suggestions: [`${lower}123`, `${lower}_store`, `the${lower}`]
    });
  }

  return res.json({ available: true });
});

// ✅ Live visitor count (fixed version)
let liveVisitors = 0;

io.on('connection', (socket) => {
  liveVisitors++;
  io.emit('visitorCount', liveVisitors);

  socket.on('disconnect', () => {
    liveVisitors--;
    io.emit('visitorCount', liveVisitors);
  });
});

// ✅ Dashboard Stats API
app.get('/api/dashboard-stats', (req, res) => {
  res.json({
    totalOrders: 132,
    revenue: 8970,
    products: 48,
    reviews: 4.7
  });
});

// ✅ Start server (with socket.io)
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
