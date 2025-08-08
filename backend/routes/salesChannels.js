const express = require('express');
const router = express.Router();
const controller = require('./controllers/salesChannelsController');

// Base routes
router.get('/', controller.getChannels);
router.put('/', controller.updateChannel);

// Facebook OAuth
router.get('/facebook/login', controller.facebookLogin);
router.get('/facebook/callback', controller.facebookCallback);

module.exports = router;

