const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

async function resetTestDb() {
  await pool.query(`
    TRUNCATE purchased_content, content, users RESTART IDENTITY CASCADE;

    -- password = "password"
    INSERT INTO users (username, password, is_admin)
    VALUES (
      'testuser',
      '$2b$10$e7Q.ljZV7K1OjzkQ5xNUIuKaDF83eXJuKT0HVfl13PbW3Z2M0pU1G',
      false
    );
  `);
}

module.exports = { resetTestDb, pool };
