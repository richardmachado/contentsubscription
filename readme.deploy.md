🚀 Deployment & Prod Sanity Guide

Frontend (prod): https://contentsubscription.vercel.app
Backend (prod): https://contentsubscriptionbackend.onrender.com

This guide is the quick checklist you can run after any deploy (or when something feels off).

0) Environment Matrix ✅

Render (API) – Environment Variables

JWT_SECRET=<your-secret>
JWT_TTL=2h
STRIPE_SECRET_KEY=<your-test-or-live-key>
FRONTEND_URL=https://contentsubscription.vercel.app
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://contentsubscription.vercel.app
DEFAULT_CURRENCY=usd
PRICE_UNITS=cents   # or 'dollars' if DB stores 39.00
NODE_ENV=production


Vercel (Frontend) – Project Env

VITE_API_URL=https://contentsubscriptionbackend.onrender.com
# (CRA alternative) REACT_APP_API_BASE=https://contentsubscriptionbackend.onrender.com


Local dev – frontend/.env.local

# Hit prod API (or point at localhost:5000 if you run API locally)
VITE_API_URL=https://contentsubscriptionbackend.onrender.com


server.js guard (already applied)

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config(); // never override prod env on Render
}

1) Pre-Deploy Checklist ✅

 Backend built & deployed on Render (no failing health check)

 Frontend built & deployed on Vercel (no build errors)

 ALLOWED_ORIGINS contains your dev & prod origins

 JWT_TTL is ≥ 2h (covers Stripe flow)

 buy.js uses origin-based success_url/cancel_url

 confirmPayment.js checks session.metadata.user_id === req.user.id

 ProtectedRoute reads token from context and stashes Stripe params

 /login wrapped with LoggedOutRoute (redirects to / if logged in)

 No service worker caching stale bundles (see §8)

2) Backend Probes (curl) ✅
API="https://contentsubscriptionbackend.onrender.com"

# Health
curl -i "$API/healthz"

# Unauthorized should be JSON, not HTML
curl -i "$API/api/profile"

# Login (replace with real creds); prints JWT only
TOKEN=$(curl -s -X POST "$API/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"<your_user>","password":"<your_pass>"}' \
  | node -e "process.stdin.on('data',b=>{try{console.log(JSON.parse(b).token||'')}catch{}})")

echo "TOKEN: $TOKEN"

# Profile with token
curl -i "$API/api/profile" -H "Authorization: Bearer $TOKEN"


✅ Expect JSON everywhere (no <!doctype html>). If you get HTML: you hit the frontend or a platform page → check base URLs and server logs.

3) CORS Sanity (Dev → Prod API) ✅

From http://localhost:3000, open DevTools → Network, load /api/profile:

Request URL must be your Render API

Response JSON (401/403/200 ok — but not HTML)
If blocked, add http://localhost:3000 to ALLOWED_ORIGINS.

4) Frontend Routing ✅

/login shows login when logged out; redirects to / when logged in

/ is protected by ProtectedRoute (uses AuthContext; stashes ?status/session_id if no token)

Quick console sanity (on any origin):

// after login
localStorage.getItem('token')  // should be a non-empty JWT

// hard refresh on "/" should keep you logged in

5) Stripe Return URLs (critical) ✅

Origin-based return URLs in routes/buy.js:

From localhost you should log (server):

[checkout return] origin=http://localhost:3000
successUrl=http://localhost:3000/?status=success&session_id=...


From live you should log:

[checkout return] origin=https://contentsubscription.vercel.app
successUrl=https://contentsubscription.vercel.app/?status=success&session_id=...


If origin is null, ensure the buy call is done via browser fetch/axios (not server-to-server).

6) End-to-End Purchase ✅

Localhost flow

Log in → check localStorage.getItem('token')

Buy an item → Stripe → returns to http://localhost:3000/?status=success&session_id=...

Dashboard:

calls GET /api/confirm-payment?session_id=... with Authorization

shows confetti 🎉

Purchased tab updates

Live flow
Same as above, but on https://contentsubscription.vercel.app.

7) Troubleshooting (quick decision tree) ✅

At / after Stripe, you see Login

localStorage.getItem('token') is null → login didn’t persist or token expired (increase JWT_TTL)

Token exists → deployed old ProtectedRoute? Must use context & stash ?status

Visiting /login while logged in → wrap /login with LoggedOutRoute

“This session does not belong to the current user”

You returned to the other origin (live vs localhost). Origin-based success_url fixes it (already done).

<!doctype html> parsing error

You hit the frontend/platform page instead of API. Confirm axios baseURL & route, check Render logs for route crashes.

8) Nuke Stale Service Worker (if ever enabled) ✅

Sometimes CRA PWA caching serves an old bundle.

In the site console (run both origins):

navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
location.reload(true);


Also ensure your app registers no service worker in code.

9) Minimal Logging to Keep (helpful in prod) ✅
// server.js (temporary when debugging)
// app.use((req, _res, next) => { console.log('[REQ]', req.method, req.path, 'origin=', req.get('origin')); next(); });

// routes/buy.js (keep this until you’re fully confident)
console.log('[checkout return]', { origin: callerOrigin, successUrl, cancelUrl });

10) Reference Snippets ✅

Origin-based return URLs (buy.js)

function getCallerOrigin(req) {
  const origin = req.get('origin');
  if (origin) return origin;
  const ref = req.get('referer');
  if (!ref) return null;
  try { return new URL(ref).origin; } catch { return null; }
}

const callerOrigin = getCallerOrigin(req);
const frontendBase = (callerOrigin || process.env.FRONTEND_URL || 'https://contentsubscription.vercel.app')
  .replace(/\/+$/, '');
const successUrl = `${frontendBase}/?status=success&session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl  = `${frontendBase}/?status=cancel`;


Ownership check (confirmPayment.js)

if (session.metadata?.user_id && String(session.metadata.user_id) !== String(req.user.id)) {
  return res.status(403).json({ error: 'This session does not belong to the current user' });
}


AuthContext: tolerant decode (optional hardening)

// prefer: import * as jwt from 'jwt-decode';
// const decodeJWT = (t) => (jwt.jwtDecode || jwt.default)(t);
// keep token even if decode fails; don’t nuke it

11) Rollback Plan ✅

Revert frontend to last known-good build (invalidate caches / unregister SW)

Keep confirmPayment ownership check in place

If needed, temporarily log request headers & Stripe session IDs to confirm who’s calling what

Verify Render env vars (especially ALLOWED_ORIGINS, JWT_SECRET, JWT_TTL)