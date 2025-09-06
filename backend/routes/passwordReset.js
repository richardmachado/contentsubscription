// backend/routes/passwordReset.js
const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;
const run = dbExport.query || ((...args) => pool.query(...args));
const nodemailer = require('nodemailer');

/** Gmail SMTP transporter (App Password required) */
function createGmailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true', // 465 -> true
    auth: {
      user: process.env.SMTP_USER, // youraddress@gmail.com
      pass: process.env.SMTP_PASS, // 16-char App Password
    },
  });
}

const transporter = createGmailTransport();

// Optional: verify on boot, logs a clear error if creds are wrong
transporter.verify().then(
  () => console.log('[mail] Gmail SMTP ready'),
  (e) => console.error('[mail] Gmail SMTP verify failed:', e.message)
);

/** POST /api/forgot-password  { email } */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Look up user by email (adjust if you store usernames)
    const { rows } = await run(`SELECT id, email FROM public.users WHERE email = $1 LIMIT 1`, [
      email,
    ]);
    const user = rows[0];

    // Always return 200 to prevent account enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const ttlMinutes = Number(process.env.PASSWORD_RESET_TTL_MIN || 60);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await run(
        `INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${origin.replace(/\/+$/, '')}/reset-password?token=${token}`;

      // ✅ Send the email here
      const from = process.env.RESET_EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
      const info = await transporter.sendMail({
        to: user.email,
        from,
        subject: 'Reset your password',
        html: `
          <p>We received a request to reset your password.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
        `,
      });
      console.log('[mail] Sent reset email to', user.email, 'messageId=', info.messageId);
    }

    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

/** POST /api/reset-password  { token, password } */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const { rows } = await run(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
         FROM public.password_reset_tokens prt
        WHERE prt.token = $1
        LIMIT 1`,
      [token]
    );

    const t = rows[0];
    if (!t) return res.status(400).json({ error: 'Invalid token' });
    if (t.used) return res.status(400).json({ error: 'Token already used' });
    if (new Date(t.expires_at) < new Date())
      return res.status(400).json({ error: 'Token expired' });

    const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hash = await bcrypt.hash(password, saltRounds);

    await run('BEGIN');
    await run(`UPDATE public.users SET password = $1 WHERE id = $2`, [hash, t.user_id]);
    await run(`UPDATE public.password_reset_tokens SET used = TRUE WHERE id = $1`, [t.id]);
    await run('COMMIT');

    return res.json({ ok: true });
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch {}
    next(err);
  }
});

module.exports = router;
