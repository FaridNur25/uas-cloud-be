const { Pool } = require('pg');

// Untuk production di Cloud Run, gunakan environment variables
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.126.134.190',
  database: process.env.DB_NAME || 'uas_cloud',
  password: process.env.DB_PASSWORD || 'domisili123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  // Tambahan konfigurasi untuk Cloud Run
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10, // maksimal 10 koneksi
  min: 2   // minimal 2 koneksi
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