require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");

const stripe = require("stripe")(process.env.STRIPE_SECRET);
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 🔥 Raw body must come BEFORE bodyParser
app.use("/webhook", express.raw({ type: "application/json" }));

// Normal middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// JWT auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// User registration
app.post("/api/register", async (req, res) => {
  const { username, password, is_admin = false } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password, email, is_admin) VALUES ($1, $2, $3)",
      [username, hash, is_admin]
    );
    res.json({ success: true });
  } catch {
    res.status(400).json({ success: false, error: "Registration failed" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  // console.log("Trying to log in", { username, password });
  const user = result.rows[0];
  if (!user) return res.status(401).json({ success: false, error: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, error: "Wrong password" });
  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    process.env.JWT_SECRET
  );
  res.json({ success: true, token });
});

// Get and update profile
app.get("/api/profile", auth, async (req, res) => {
  const result = await pool.query("SELECT name, phone , email FROM users WHERE id = $1", [req.user.id]);
  res.json(result.rows[0] || {});
});

app.post("/api/profile", auth, async (req, res) => {
  
  const { name, phone, email } = req.body;  
  const digitsOnly = phone.replace(/\D/g, "");
if (!/^\d{10}$/.test(digitsOnly)) {
  return res.status(400).json({ error: "Invalid phone number format" });
}
  await pool.query("UPDATE users SET name = $1, phone = $2 , email = $3 WHERE id = $4", [name, phone, email, req.user.id]);
  res.json({ success: true });
});

// Get content with purchase status
app.get("/api/content", auth, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, 
      EXISTS (
        SELECT 1 FROM purchased_content pc 
        WHERE pc.user_id = $1 AND pc.content_id = c.id
      ) AS purchased
    FROM content c`,
    [req.user.id]
  );
  res.json(result.rows);
});

// Create Stripe Checkout session
app.post("/api/buy/:id", auth, async (req, res) => {
  const contentRes = await pool.query("SELECT * FROM content WHERE id = $1", [req.params.id]);
  const content = contentRes.rows[0];
  if (!content) return res.status(404).json({ error: "Content not found" });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: content.title },
        unit_amount: content.price,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/dashboard`,
    metadata: {
      userId: req.user.id,
      contentId: content.id,
    },
  });

  res.json({ url: session.url });
});

// Stripe webhook
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const contentId = session.metadata.contentId;
    try {
      await pool.query(
        "INSERT INTO purchased_content (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, contentId]
      );
     
    } catch (err) {
      console.error("Database error:", err);
    }
  }

  res.sendStatus(200);
});

// Middleware to authenticate admin
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.is_admin) {
      return res.status(403).json({ error: "Not an admin" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ✅ Admin route (deduplicated)
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT u.id, u.username, u.name, u.phone, u.email,
        COALESCE(json_agg(c.title) FILTER (WHERE c.title IS NOT NULL), '[]') AS purchased
      FROM users u
      LEFT JOIN purchased_content pc ON u.id = pc.user_id
      LEFT JOIN content c ON pc.content_id = c.id
      GROUP BY u.id
    `;
    const result = await pool.query(userQuery);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});console

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

// .log("DB user:", user);
// console.log("Password match:", await bcrypt.compare(password, user?.password));


module.exports = app; // 👈 for Supertest