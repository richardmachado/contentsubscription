// server/config/origin.js
export function getFrontendOrigin() {
  const isProd = process.env.NODE_ENV === 'production';
  const prod = process.env.FRONTEND_URL_PROD; // e.g. https://contentsubscription.vercel.app
  const dev = process.env.FRONTEND_URL_DEV || 'http://localhost:3000';
  return isProd ? prod : dev;
}
