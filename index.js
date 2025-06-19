const express = require('express');
const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware JSON
app.use(express.json());

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
const bucketName = 'bucket_uas';
const bucket = storageGCS.bucket(bucketName);

// === CREATE penduduk + Upload KTP ===
app.post('/penduduk', upload.single('foto_ktp'), async (req, res) => {
  const { nik, nama, telp, alamat, tipe } = req.body;
  const file = req.file;

  if (!file) return res.status(400).send('Foto KTP wajib diupload');

  try {
    const gcsFileName = 'images/' + Date.now() + '-' + file.originalname;

    // Upload ke GCS
    await bucket.upload(file.path, {
      destination: gcsFileName,
      resumable: false,
      public: true,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;

    // Simpan ke DB
    const result = await pool.query(
      `INSERT INTO penduduk (nik, nama, telp, alamat, foto_ktp, tipe)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nik, nama, telp, alamat, publicUrl, tipe]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Gagal upload & simpan:', err);
    res.status(500).send('Gagal menambahkan penduduk');
  }
});

// === READ semua penduduk ===
app.get('/penduduk', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM penduduk ORDER BY id_penduduk');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengambil data');
  }
});

// === UPDATE penduduk (tanpa ubah foto) ===
app.put('/penduduk/:id', async (req, res) => {
  const { id } = req.params;
  const { nik, nama, telp, alamat, tipe } = req.body;

  try {
    const result = await pool.query(
      `UPDATE penduduk SET nik=$1, nama=$2, telp=$3, alamat=$4, tipe=$5
       WHERE id_penduduk=$6 RETURNING *`,
      [nik, nama, telp, alamat, tipe, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengupdate penduduk');
  }
});

// === DELETE penduduk ===
app.delete('/penduduk/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM penduduk WHERE id_penduduk=$1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus penduduk');
  }
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
