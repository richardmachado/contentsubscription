// backend/db.js
const { Pool } = require('pg');
const dns = require('dns');

// Prefer IPv4 (avoids IPv6 egress issues on some hosts)
dns.setDefaultResultOrder?.('ipv4first');

// --- Read & sanitize DATABASE_URL (remove hidden newlines) ---
const raw = process.env.DATABASE_URL || '';
const connectionString = raw.replace(/[\r\n]+/g, '').trim();

const DEBUG = String(process.env.DB_DEBUG || '').toLowerCase() === 'true';
if (!connectionString) {
  console.error('[DB] DATABASE_URL is missing/empty');
}

let url;
try {
  url = new URL(connectionString);
  if (DEBUG) {
    console.log(
      'Running: [DB] host=',
      JSON.stringify(url.hostname),
      'port=',
      Number(url.port || 5432)
    );
  }
} catch (e) {
  console.error('[DB] Invalid DATABASE_URL:', e.message);
}

// Original hostname (needed for TLS SNI)
const originalHost = url?.hostname || 'localhost';

// Optional IPv4 override (to fully bypass DNS/AAAA in containers):
// Set on Render to the numeric A-record (e.g., 52.12.34.56), no brackets/quotes.
const hostOverride = process.env.DATABASE_HOST_IPV4 || null;

// Toggle TLS verification only for local dev
const sslInsecure = String(process.env.PG_SSL_INSECURE || '').toLowerCase() === 'true';

// Supabase requires TLS. When dialing by IP, set SNI to the real hostname so certs validate.
const ssl = {
  rejectUnauthorized: !sslInsecure,
  servername: originalHost,
};

// Pick the host we’ll actually connect to
const hostToUse = hostOverride || originalHost;
// if (DEBUG) {
//   console.log(
//     '[DB] using host =',
//     hostToUse,
//     'SNI =',
//     originalHost,
//     'ssl.rejectUnauthorized =',
//     !sslInsecure
//   );
// }

// Build the pool
const pool = new Pool({
  host: hostToUse,
  port: Number(url?.port || 5432),
  user: decodeURIComponent(url?.username || 'postgres'),
  password: decodeURIComponent(url?.password || ''),
  database: (url?.pathname || '/postgres').slice(1),
  ssl,
  keepAlive: true,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
  max: Number(process.env.PGPOOL_MAX || 10),
});

// Helpful error for idle client crashes
pool.on('error', (err) => console.error('PG pool error (idle client):', err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
