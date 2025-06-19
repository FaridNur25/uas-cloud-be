const { Pool } = require('pg');

console.log('🔧 Database configuration:');
console.log('DB_HOST:', process.env.DB_HOST || '34.126.134.190');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_NAME:', process.env.DB_NAME || 'uas_cloud');
console.log('DB_PORT:', process.env.DB_PORT || 5432);
console.log('NODE_ENV:', process.env.NODE_ENV);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.126.134.190', // IP Public Cloud SQL Anda
  database: process.env.DB_NAME || 'uas_cloud',
  password: process.env.DB_PASSWORD || 'domisili123',
  port: parseInt(process.env.DB_PORT) || 5432,
  ssl: {
    rejectUnauthorized: false // Selalu gunakan SSL untuk Cloud SQL
  },
  // Konfigurasi untuk Cloud Run
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 5, // Kurangi max connections untuk Cloud Run
  min: 1,
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
});

// Test koneksi saat startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal koneksi ke database:', err.stack);
  } else {
    console.log('✅ Berhasil koneksi ke database');
    release();
  }
});

module.exports = pool;