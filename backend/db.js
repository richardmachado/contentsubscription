// db.js
const { Pool } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder?.('ipv4first');

const raw = (process.env.DATABASE_URL || '').replace(/[\r\n]+/g, '').trim();
const u = new URL(raw);

const originalHost = u.hostname;
const ipv4Override = process.env.DATABASE_HOST_IPV4 || null; // used on Render if needed
const hostToUse = ipv4Override || originalHost;

const sslInsecure = String(process.env.PG_SSL_INSECURE || '').toLowerCase() === 'true';
// When connecting by IP, keep SNI set to the real hostname so certs match
const ssl = sslInsecure
  ? { rejectUnauthorized: false, servername: originalHost }
  : { rejectUnauthorized: true, servername: originalHost };

const pool = new Pool({
  host: hostToUse,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username || 'postgres'),
  password: decodeURIComponent(u.password || ''),
  database: (u.pathname || '/postgres').slice(1),
  ssl,
  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = { pool, query: (t, p) => pool.query(t, p) };
