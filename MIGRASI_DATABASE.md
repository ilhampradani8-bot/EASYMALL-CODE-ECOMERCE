# 📘 PANDUAN LENGKAP MIGRASI DATABASE EASYMALL
> **SQLite Lokal (`file:local_easymall.db`) ➔ Turso Cloud Database (`libsql://...`)**

Dokumen ini berisi panduan langkah-demi-langkah (step-by-step) untuk memigrasikan database dari SQLite lokal ke Turso Cloud Database secara aman tanpa error (*Zero-Downtime & Zero-Data-Loss Migration*).

---

## 📋 DAFTAR ISI
1. [Ringkasan Arsitektur Database](#1-ringkasan-arsitektur-database)
2. [Persiapan Sebelum Migrasi (Pre-Migration Checklist)](#2-persiapan-sebelum-migrasi-pre-migration-checklist)
3. [Panduan Akses & Inspeksi Database Lokal (Adminer & CLI)](#3-panduan-akses--inspeksi-database-lokal-adminer--cli)
4. [Langkah-Langkah Migrasi ke Turso Cloud DB](#4-langkah-langkah-migrasi-ke-turso-cloud-db)
5. [Verifikasi Hasil Migrasi](#5-verifikasi-hasil-migrasi)
6. [Rencana Pemulihan (Rollback Plan & Emergency)](#6-rencana-pemulihan-rollback-plan--emergency)

---

## 1. 🏗️ RINGKASAN ARSITEKTUR DATABASE

Aplikasi EasyMall dirancang dengan arsitektur **Hybrid DB Fallback**:
- **Mode Development (Lokal)**: Menggunakan SQLite file `frontend/local_easymall.db` yang dapat dikelola via Adminer UI di port `8888` atau script CLI (`npm run db:view`).
- **Mode Production (Cloud)**: Menggunakan **Turso Cloud Database** (`@libsql/client` protocol `libsql://...`).
- **Fitur Auto-Fallback**: Apabila jaringan/kredensial Turso mengalami kendala, SDK `@libsql/client` secara otomatis beralih ke SQLite lokal untuk mencegah *downtime*.

### Skema Tabel Utama:
1. `users` – Menyimpan akun pengguna (`email`, `password`, `name`, `avatar`, `provider`, `created_at`).
2. `sessions` – Menyimpan token sesi login pengguna.
3. `transactions` – Menyimpan riwayat transaksi pembelian & pembatalan.
4. `products` – Menyimpan rincian produk lokal.
5. `cart_items` – Menyimpan item keranjang belanja pengguna.

---

## 2. 📝 PERSIAPAN SEBELUM MIGRASI (PRE-MIGRATION CHECKLIST)

Sebelum melakukan migrasi ke Turso Production, pastikan hal-hal berikut:

- [x] **Backup Database Lokal**: Buat salinan cadangan dari file `local_easymall.db`.
- [x] **Akun Turso**: Pastikan akun Turso Cloud aktif dan memiliki izin membuat database baru.
- [x] **Turso CLI Terinstall** (Opsional tapi direkomendasikan): `curl -sSfL https://get.tur.so/install.sh | bash`.
- [x] **Validasi Data**: Pastikan kredensial login dev & data pendukung sudah dites di lokal.

---

## 3. 🔍 PANDUAN AKSES & INSPEKSI DATABASE LOKAL

### A. Menggunakan Adminer Web UI (GUI)
EasyMall telah dilengkapi **Adminer Database Manager** berbasis web:
- **URL Access**: `http://166.0.112.212:8888/`
- **System**: Select `SQLite 3`
- **Database File Path**: `/root/ecomerce/frontend/local_easymall.db` (Atau biarkan default auto-login).
- **Fitur Adminer**:
  - Melihat struktur tabel dan indeks.
  - Melakukan ekspor/dump SQL langsung dari UI.
  - Menjalankan SQL Query kustom.

### B. Menggunakan Script Inspection CLI
Jalankan perintah berikut di direktori `frontend/`:
```bash
npm run db:view
```
Script ini akan menampilkan ringkasan data pengguna, transaksi, dan tabel yang terdaftar.

---

## 4. 🚀 LANGKAH-LANGKAH MIGRASI KE TURSO CLOUD DB

### **Langkah 1: Backup Database Lokal**
Jalankan perintah backup file database SQLite lokal:
```bash
cp /root/ecomerce/frontend/local_easymall.db /root/ecomerce/frontend/local_easymall.db.bak.$(date +%Y%m%d_%H%M%S)
```

---

### **Langkah 2: Buat Database Baru di Turso Cloud**
Jalankan via Turso CLI:
```bash
# 1. Login ke Turso
turso auth login

# 2. Buat database baru (contoh: easymall-production)
turso db create easymall-production

# 3. Ambil URL Database Turso
turso db show easymall-production --url
# Output: libsql://easymall-production-[org].turso.io

# 4. Buat Auth Token untuk database
turso db tokens create easymall-production
# Output: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

---

### **Langkah 3: Ekspor Data Lokal ke SQL Dump**
Jika ingin memindahkan seluruh isi data SQLite lokal ke Turso:

**Opsi A: Menggunakan SQLite CLI**
```bash
sqlite3 /root/ecomerce/frontend/local_easymall.db .dump > /root/ecomerce/frontend/easymall_dump.sql
```

**Opsi B: Menggunakan Seeding Script Otomatis (Direkomendasikan)**
Jalankan script seeder bawaan yang secara otomatis membuat skema dan akun default:
```bash
cd /root/ecomerce/frontend
npm run db:seed
```

---

### **Langkah 4: Impor Skema & Data ke Turso Cloud**

Jika menggunakan Dump File via Turso CLI:
```bash
turso db shell easymall-production < /root/ecomerce/frontend/easymall_dump.sql
```

Jika mengimpor skema awal secara manual via Turso Shell:
```bash
turso db shell easymall-production < /root/ecomerce/frontend/src/lib/schema.sql
```

---

### **Langkah 5: Perbarui File Konfigurasi `.env`**

Buka file `/root/ecomerce/frontend/.env` dan perbarui nilainya dengan kredensial Turso Production:

```env
# TURSO CLOUD PRODUCTION DATABASE CONFIGURATION
TURSO_DATABASE_URL="libsql://easymall-production-[org].turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

> **Catatan Penting**: Gantikan `libsql://` dengan URL Turso asli Anda dan pastikan `TURSO_AUTH_TOKEN` tidak mengandung spasi tambahan.

---

## 5. ✅ VERIFIKASI HASIL MIGRASI

Setelah konfigurasi `.env` diperbarui, lakukan pengujian berikut untuk memastikan migrasi 100% sukses tanpa error:

### **1. Test Koneksi DB & Query**
Jalankan seeder / viewer script:
```bash
cd /root/ecomerce/frontend
node scripts/view-db.mjs
```
*Pastikan output menunjukkan status terhubung ke Turso Cloud DB dan jumlah baris tabel sesuai.*

### **2. Build & Test Aplikasi Frontend**
Jalankan build test untuk memastikan TypeScript & API Route tidak bermasalah:
```bash
npm run build
```

### **3. Uji Login Akun Default**
Buka browser dan uji login pada mode Dev/Production:
- **Akun User**: `user@easymall.me` / `user1234`
- **Akun Reseller**: `reseller@easymall.me` / `reseller1234`

---

## 6. 🛡️ RENCANA PEMULIHAN (ROLLBACK PLAN)

Jika terjadi kendala koneksi internet ke cloud atau token Turso expired, Anda dapat melakukan pemulihan instan ke SQLite lokal dalam 10 detik:

1. **Kembalikan file `.env` ke SQLite Lokal**:
   Ubah variabel di `.env`:
   ```env
   TURSO_DATABASE_URL="file:local_easymall.db"
   TURSO_AUTH_TOKEN=""
   ```

2. **Restore Backup SQLite (Jika Data Rusak)**:
   ```bash
   cp /root/ecomerce/frontend/local_easymall.db.bak.* /root/ecomerce/frontend/local_easymall.db
   ```

3. **Restart Server Application**:
   ```bash
   npm run dev
   ```

---

### Summary Perintah Cepat (Quick Cheatsheet)
| Aksi | Perintah |
|---|---|
| **Akses Adminer Web** | `http://166.0.112.212:8888/` |
| **Lihat DB via CLI** | `npm run db:view` |
| **Seed / Inisialisasi DB** | `npm run db:seed` |
| **Backup SQLite Lokal** | `cp frontend/local_easymall.db local_easymall.db.bak` |
| **Build Web App** | `npm run build` |

---
*Dokumen ini dibuat secara otomatis untuk proyek EasyMall E-Commerce.*
