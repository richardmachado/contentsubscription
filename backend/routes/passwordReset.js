// backend/routes/passwordReset.js
const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');

const dbExport = require('../db');
const pool = dbExport.pool || dbExport;
const run = dbExport.query || ((...args) => pool.query(...args));

/** Resend client (HTTPS API, works on Render) */
const resend = new Resend(process.env.RESEND_API_KEY);

/** Helper: send reset email via Resend */
/** Helper: send reset email via Resend */
async function sendResetEmail({ to, resetUrl }) {
  const from = process.env.RESET_EMAIL_FROM || 'onboarding@resend.dev';

  // Sandbox guard: when using onboarding@resend.dev you can only send to your own account email
  const fromAddr = (process.env.RESET_EMAIL_FROM || '').toLowerCase();
  const isSandbox = fromAddr.endsWith('@resend.dev');
  const allowedTest = (
    process.env.RESEND_TEST_RECIPIENT || 'programmingwithrick@gmail.com'
  ).toLowerCase();

  if (isSandbox && to.toLowerCase() !== allowedTest) {
    console.warn('[mail] Skipping send in sandbox to non-allowed recipient:', to);
    return null; // pretend success; avoid user enumeration
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Reset your password',
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
    // optional: have replies go to your Gmail
    // replyTo: 'programmingwithrick@gmail.com',
  });

  if (error) {
    throw new Error(`[Resend] send failed: ${error.name || ''} ${error.message || ''}`);
  }

  return data?.id || null;
}

/** POST /api/forgot-password  { email } */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Look up user by email
    const { rows } = await run(`SELECT id, email FROM public.users WHERE email = $1 LIMIT 1`, [
      email,
    ]);
    const user = rows[0];

    // Always return 200 to avoid account enumeration
    if (user) {
      // Create token row
      const token = crypto.randomBytes(32).toString('hex');
      const ttlMinutes = Number(process.env.PASSWORD_RESET_TTL_MIN || 60);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await run(
        `INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      // Build reset URL
      const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${origin.replace(/\/+$/, '')}/reset-password?token=${token}`;

      // Send email via Resend (HTTPS, no SMTP ports)
      try {
        const id = await sendResetEmail({ to: user.email, resetUrl });
        console.log('[mail] Reset email sent', { to: user.email, id });
      } catch (mailErr) {
        console.error('[mail] Resend error:', mailErr.message);
        // Do not fail the endpoint to avoid leaking which emails exist
      }
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

    // Validate token
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

    // Hash new password
    const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hash = await bcrypt.hash(password, saltRounds);

    // Write changes atomically
    await run('BEGIN');
    // NOTE: If your column is password_hash, change the column name below accordingly.
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
