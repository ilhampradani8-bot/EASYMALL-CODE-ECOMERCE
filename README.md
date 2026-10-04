# 🛍️ EasyMall E-Commerce System

Sistem E-Commerce modern berbasis **Astro (SSG + Serverless API Routes)** yang di-deploy secara otomatis ke **Vercel**.

---

## 🔗 Akses & Preview Link

- **Production URL**: [https://easymall.ilhampradani.me/](https://easymall.ilhampradani.me/) atau [https://www.malldigital.tech/](https://www.malldigital.tech/)
- **Development Server (Local/VPS)**: `http://localhost:4321/`
- **Katalog Produk API**: `/api/products`
- **Cari Seller**: `/cari_seller`
- **Pusat Pesan / Live Chat**: `/pesan`

---

## 🛠️ Arsitektur & Teknologi

* **Frontend Framework**: Astro, Vanilla CSS modern, responsive glassmorphism design.
* **Backend API**: Astro Serverless API Routes (`frontend/src/pages/api/*.ts`) diproses via `@astrojs/vercel`.
* **Database & Persistence**:
  * **Turso Cloud SQLite / Local SQLite**: Transaksi, sesi pengguna, produk, dan pesan chat (`messages`).
* **Vendor & Gateway Integrasi**:
  * **KoalaStore API**: Katalog produk digital (streaming, subscription, software).
  * **Miracle Gaming API & MeloStore H2H (Tahap Dev / Siap Integrasi)**: Top-up diamond & voucher game.
  * **BuatQRIS API**: Otomatisasi pembayaran dynamic QRIS real-time.
  * **Telegram Admin Bot Webhook (`/api/telegram/webhook`)**: 2-Way live chat gateway (notifikasi & balasan instan dari Telegram ke web).
* **Deployment**: **100% Serverless di Vercel** (Bebas dari kebergantungan proses manual VPS).

---

## 🌟 Fitur Unggulan

1. **⚡ 2-Way Live Chat System (Bubble Chat + Dashboard macOS `/pesan`)**:
   - Widget chat mengambang (*floating bubble*) di beranda terhubung langsung dengan Pusat Pesan di Dashboard.
   - Pesan tersimpan permanen di database `messages`.
   - Otomatis migrasi pesan tamu ke akun resmi saat pengguna melakukan login.
   - Terhubung langsung ke Telegram Admin Bot: Balasan dari Telegram langsung diteruskan ke pembeli via Webhook.

2. **🔍 Cari Seller & Toko Partner (`/cari_seller`)**:
   - Filter real-time pencarian seller berdasarkan nama, username, atau produk yang dijual.
   - Menampilkan badge status toko (Aktif / Buka), rating, serta tombol Chat Langsung ke Seller.

3. **🎮 Katalog Game Lengkap & Status Development**:
   - Denominasi lengkap untuk Mobile Legends, Free Fire, Valorant, CODM, PUBG Mobile, Genshin Impact, Roblox, Steam Wallet, AOV, dan lainnya.
   - Penandaan transparan `TAHAP DEV` / `⚠️ Non-Realtime / Dev` untuk item dalam pengembangan.

4. **💳 Checkout & Pembayaran QRIS Instan**:
   - Pembuatan tagihan QRIS dinamis otomatis dengan verifikasi status pembayaran real-time.

---

## 🗂️ Struktur Direktori

```
.
├── README.md                           ← Dokumentasi panduan proyek
├── SISTEM_EASYMALL.md                  ← Master documentation & single source of truth
├── vercel.json                         ← Konfigurasi Vercel deployment
├── dinamis/
│   └── api_docs/
│       ├── melostore-h2h.openapi.json  ← Spesifikasi OpenAPI MeloStore H2H
│       └── api-1 docmentastion koalastore.json
└── frontend/                           ← Kode sumber utama aplikasi Astro
    ├── astro.config.mjs                ← Adapter @astrojs/vercel (output: 'server')
    ├── package.json                    ← Dependensi Astro & Vercel
    ├── public/                         ← Aset statis, CSS, JS, dan gambar logo
    └── src/
        ├── components/                 ← Komponen Header, Footer, FloatingChat, dll.
        ├── lib/                        ← Helper DB, autentikasi, dan pesan (messages.ts)
        ├── pages/                      ← Halaman web (.astro)
        └── pages/api/                  ← Astro Serverless API Routes
            ├── products.ts             ← Katalog produk + auto markup
            ├── checkout.ts             ← Integrasi checkout BuatQRIS
            ├── messages/               ← API Chat, history, contacts, & send
            ├── telegram/webhook.ts     ← Telegram bot webhook receiver & auto-setter
            ├── sellers/list.ts         ← API data seller partner
            └── auth/status.ts          ← Status autentikasi sesi
```

---

## 🚀 Panduan Pengembangan (Development)

### 1. Menjalankan Dev Server Lokal
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 4321
```
Akses di browser: `http://localhost:4321`.

### 2. Mengaktifkan Webhook Telegram Bot
Buka URL berikut pada domain live Anda (sekali saja):
```text
https://<DOMAIN_ANDA>/api/telegram/webhook?action=set_webhook
```

### 3. Deploy ke Production (Vercel)
Setiap commit & push ke branch `master` akan di-deploy secara otomatis oleh Vercel:
```bash
git add .
git commit -m "Update README and push features"
git push origin master
```
