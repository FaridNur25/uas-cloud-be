const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '34.126.134.190',      // Ganti dengan IP public Cloud SQL
  database: 'uas_cloud',
  password: 'domisili123',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Penting jika PostgreSQL GCP public IP pakai SSL
  }
});

module.exports = pool;
