const express = require('express');
const router = express.Router();
const controller = require('./controllers/salesChannelsController');
const SalesChannels = require('../models/salesChannels'); // 👈 this line is missing

// GET: Get all channels for user
exports.getChannels = async (req, res) => {
  const email = req.query.signup_Email;
  if (!email) return res.status(400).json({ error: "Email required" });

  let record = await SalesChannels.findOne({ email });
  if (!record) {
    record = await SalesChannels.create({ email });
  }

  res.json(record);
};

// PUT: Update channel for user
exports.updateChannel = async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });

  const update = req.body;
  try {
    const updated = await SalesChannels.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update channel" });
  }
};
exports.facebookCallback = async (req, res) => {
  const { code, state } = req.query; // state = email

  if (!code || !state) {
    return res.status(400).send("Missing data from Facebook");
  }

  const email = state;
  const clientId = "1405951867301181";
  const clientSecret = "58f29f5801ec5fa33ca15f7cf28ffa70";
  const redirectUri = "http://localhost:3000/api/sales-channels/facebook/callback";

  // 1. Exchange code for token
  const tokenUrl = `https://graph.facebook.com/v14.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`;

  try {
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) throw new Error("No access token");

    // 2. Mark channel as connected
    await SalesChannels.findOneAndUpdate(
      { email },
      { $set: { facebook: true } },
      { new: true, upsert: true }
    );

    res.redirect("/sales-channels.html"); // back to UI
  } catch (err) {
    console.error(err);
    res.status(500).send("Facebook connection failed");
  }
};
exports.facebookLogin = (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send("Email required");

  const clientId = "1405951867301181";
  const redirectUri = encodeURIComponent("http://localhost:3000/api/sales-channels/facebook/callback");
  const state = email;

  const fbLoginUrl = `https://www.facebook.com/v14.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=email,public_profile`;

  res.redirect(fbLoginUrl);
};

