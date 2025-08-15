require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const r = await pool.query('select now()');
    console.log('OK', r.rows[0]);
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await pool.end();
  }
})();
