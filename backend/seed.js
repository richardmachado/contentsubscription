const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'richardmachado',
  host: 'localhost',
  database: 'myappdb',
  port: 5432,
});

const seed = async () => {
  const users = [
    {
      username: 'alice',
      password: 'password123',
      paid: true,
      name: 'Alice Johnson',
      phone: '555-111-2222',
    },
    {
      username: 'bob',
      password: 'mypassword',
      paid: false,
      name: 'Bob Smith',
      phone: '555-333-4444',
    },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      'INSERT INTO users (username, password, paid, name, phone) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING',
      [user.username, hash, user.paid, user.name, user.phone]
    );
  }

  console.log('Seeded users with hashed passwords!');
  process.exit();
};

seed();
