const express = require('express');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const webhookRoute = require('./routes/stripeWebhook');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', contentRoutes);
router.use('/admin', adminRoutes);
router.use('/webhook', webhookRoute);

module.exports = router;
