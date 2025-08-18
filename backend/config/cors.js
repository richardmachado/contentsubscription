// server/cors.js (optional helper file)
import cors from 'cors';

function parseOrigins(list) {
  return (list || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, '')) // trim + remove trailing slashes
    .filter(Boolean);
}

const allowed = new Set(parseOrigins(process.env.ALLOWED_ORIGINS));

// Optional: allow all vercel preview subdomains for your project
const vercelPreview = /^https:\/\/contentsubscription-[a-z0-9-]+\.vercel\.app$/i;

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow server-to-server, curl, Postman (no Origin header)
    if (!origin) return cb(null, true);

    const normalized = origin.replace(/\/+$/, '');
    if (allowed.has(normalized) || vercelPreview.test(normalized)) {
      return cb(null, true);
    }
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
