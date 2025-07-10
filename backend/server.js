require('dotenv').config();
console.log('Stripe Secret Key:', process.env.STRIPE_SECRET);
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5000;

// Stripe raw body first
app.use('/webhook', express.raw({ type: 'application/json' }));

// Normal middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/content'));
app.use('/api/admin', require('./routes/admin'));
app.use('/webhook', require('./routes/stripeWebhook'));

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
  });
}

module.exports = app;
