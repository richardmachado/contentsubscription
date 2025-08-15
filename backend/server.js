// backend/db.js
const { Pool } = require('pg');
const dns = require('dns');

// Prefer IPv4 for any lookups that still happen
dns.setDefaultResultOrder?.('ipv4first');

const raw = (process.env.DATABASE_URL || '').replace(/[\r\n]+/g, '').trim();
if (!raw) {
  console.error('DATABASE_URL is empty');
}

const u = new URL(raw);

// Allow an explicit IPv4 override via env (DATABASE_HOST_IPV4)
// This completely bypasses AAAA records inside the container.
const originalHost = u.hostname;
const ipv4Override = process.env.DATABASE_HOST_IPV4; // e.g. "52.12.34.56"
const hostToUse = ipv4Override || originalHost;

const cfg = {
  host: hostToUse,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username || 'postgres'),
  password: decodeURIComponent(u.password || ''),
  database: (u.pathname || '/postgres').slice(1),

  // Keep TLS strict in prod. When using an IP, set SNI to the original hostname
  // so the certificate matches and verification passes.
  ssl: {
    rejectUnauthorized: true,
    servername: originalHost,
  },

  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(cfg);

pool.on('error', (e) => console.error('PG pool error (idle client):', e.message));

// small startup sanity (won't crash the app)
(async () => {
  try {
    const r = await pool.query('select now()');
    console.log(
      '✅ DB connected. Host used:',
      hostToUse,
      'SNI:',
      originalHost,
      'Time:',
      r.rows[0].now
    );
  } catch (e) {
    console.error(
      '⚠️ DB check failed (continuing):',
      e.message,
      'Host used:',
      hostToUse,
      'SNI:',
      originalHost
    );
  }
})();

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
