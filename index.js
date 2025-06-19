const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware JSON
app.use(express.json());

// Pastikan folder uploads ada
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// === MULTER Setup untuk simpan file sementara ===
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// === GCS Setup ===
const storageGCS = new Storage();
const bucketName = process.env.BUCKET_NAME || 'bucket_uas';
const bucket = storageGCS.bucket(bucketName);

// === Health Check Endpoint ===
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// === Test Database Connection ===
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      message: 'Database connection successful', 
      time: result.rows[0].current_time 
    });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: err.message 
    });
  }
});

// === CREATE penduduk + Upload KTP ===
app.post('/penduduk', upload.single('foto_ktp'), async (req, res) => {
  const { nik, nama, telp, alamat, tipe } = req.body;
  const file = req.file;

  console.log('POST /penduduk - Request body:', req.body);
  console.log('POST /penduduk - File:', file ? file.filename : 'No file');

  if (!file) {
    return res.status(400).json({ error: 'Foto KTP wajib diupload' });
  }

  try {
    const gcsFileName = 'images/' + Date.now() + '-' + file.originalname;

    // Upload ke GCS
    console.log('Uploading to GCS:', gcsFileName);
    await bucket.upload(file.path, {
      destination: gcsFileName,
      resumable: false,
      public: true,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
    console.log('GCS Upload successful:', publicUrl);

    // Simpan ke DB
    const result = await pool.query(
      `INSERT INTO penduduk (nik, nama, telp, alamat, foto_ktp, tipe)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nik, nama, telp, alamat, publicUrl, tipe]
    );

    console.log('Data saved to DB:', result.rows[0]);

    // Hapus file temporary
    fs.unlinkSync(file.path);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /penduduk error:', err);
    
    // Hapus file temporary jika ada error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    res.status(500).json({ 
      error: 'Gagal menambahkan penduduk',
      details: err.message 
    });
  }
});

// === READ semua penduduk ===
app.get('/penduduk', async (req, res) => {
  console.log('GET /penduduk - Request received');
  
  try {
    console.log('Querying database...');
    const result = await pool.query('SELECT * FROM penduduk ORDER BY id_penduduk');
    
    console.log('Query result:', {
      rowCount: result.rowCount,
      rows: result.rows.length
    });
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('GET /penduduk error:', err);
    res.status(500).json({ 
      error: 'Gagal mengambil data',
      details: err.message 
    });
  }
});

// === UPDATE penduduk (tanpa ubah foto) ===
app.put('/penduduk/:id', async (req, res) => {
  const { id } = req.params;
  const { nik, nama, telp, alamat, tipe } = req.body;

  console.log(`PUT /penduduk/${id} - Request body:`, req.body);

  try {
    const result = await pool.query(
      `UPDATE penduduk SET nik=$1, nama=$2, telp=$3, alamat=$4, tipe=$5
       WHERE id_penduduk=$6 RETURNING *`,
      [nik, nama, telp, alamat, tipe, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Penduduk tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`PUT /penduduk/${id} error:`, err);
    res.status(500).json({ 
      error: 'Gagal mengupdate penduduk',
      details: err.message 
    });
  }
});

// === DELETE penduduk ===
app.delete('/penduduk/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`DELETE /penduduk/${id}`);
  
  try {
    const result = await pool.query('DELETE FROM penduduk WHERE id_penduduk=$1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Penduduk tidak ditemukan' });
    }
    
    res.status(204).send();
  } catch (err) {
    console.error(`DELETE /penduduk/${id} error:`, err);
    res.status(500).json({ 
      error: 'Gagal menghapus penduduk',
      details: err.message 
    });
  }
});

// === Error Handler Global ===
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// === 404 Handler ===
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// === Graceful Shutdown ===
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});