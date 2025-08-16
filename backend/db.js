// backend/db.js
const { Pool } = require('pg');
const dns = require('dns');

// Prefer IPv4 to dodge IPv6 egress issues in some hosts
dns.setDefaultResultOrder?.('ipv4first');

// --- Read & sanitize DATABASE_URL ---
const raw = process.env.DATABASE_URL || '';
const connectionString = raw.replace(/[\r\n]+/g, '').trim();

if (!connectionString) {
  console.error('[DB] DATABASE_URL is missing/empty');
}

// Parse once so we can control TLS + host override
let url;
try {
  url = new URL(connectionString);
} catch (e) {
  console.error('[DB] Invalid DATABASE_URL:', e.message);
}

// Original hostname (needed for TLS SNI)
const originalHost = url?.hostname || 'localhost';

// Optional: force IPv4 host (set this on Render if IPv6 keeps showing up)
// Example value: "52.12.34.56"
const hostOverride = process.env.DATABASE_HOST_IPV4 || null;
const hostToUse = hostOverride || originalHost;

// Toggle TLS verification via env (use ONLY for local dev)
const sslInsecure = String(process.env.PG_SSL_INSECURE || '').toLowerCase() === 'true';

// Supabase requires TLS; keep verification ON in prod.
// When dialing by IP, set SNI (servername) to the real hostname so certs match.
const ssl = sslInsecure
  ? { rejectUnauthorized: false, servername: originalHost }
  : { rejectUnauthorized: true, servername: originalHost };

// Pool config
const pool = new Pool({
  host: hostToUse,
  port: Number(url?.port || 5432),
  user: decodeURIComponent(url?.username || 'postgres'),
  password: decodeURIComponent(url?.password || ''),
  database: (url?.pathname || '/postgres').slice(1),
  ssl,
  keepAlive: true,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  max: Number(process.env.PGPOOL_MAX || 10),
});

pool.on('error', (err) => {
  console.error('PG pool error (idle client):', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
