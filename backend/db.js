// backend/db.js
const { Pool } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder?.('ipv4first');

const raw = process.env.DATABASE_URL || '';
const cleaned = raw.replace(/[\r\n]+/g, '').trim();

let url;
try {
  url = new URL(cleaned);
} catch (e) {
  console.error('[DB] BAD DATABASE_URL:', e.message);
}

const originalHost = url?.hostname;
const hostOverride = process.env.DATABASE_HOST_IPV4 || originalHost;

const pool = new Pool({
  host: hostOverride,
  port: Number(url?.port || 5432),
  user: decodeURIComponent(url?.username || 'postgres'),
  password: decodeURIComponent(url?.password || ''),
  database: (url?.pathname || '/postgres').slice(1),
  ssl: {
    rejectUnauthorized: true,
    servername: originalHost, // SNI so TLS cert matches even when using IP
  },
  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (e) => console.error('PG pool error:', e.message));

module.exports = { pool, query: (t, p) => pool.query(t, p) };
