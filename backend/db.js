// db.js
const { Pool } = require('pg');
const dns = require('dns');

// ⬅️ Force Node to prefer IPv4 (avoids ENETUNREACH when AAAA is returned)
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL || '';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL, // or your separate params
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// });

const pool = new Pool({
  connectionString,
  // Supabase External URLs require SSL
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
});

const query = (text, params) => pool.query(text, params);

pool.on('error', (err) => {
  console.error('PG pool error (client idle):', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};