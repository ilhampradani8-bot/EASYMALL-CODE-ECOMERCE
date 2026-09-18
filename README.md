# 🛍️ EasyMall E-Commerce System

Sistem E-Commerce modern berbasis **Astro 7 (SSG + Serverless API Routes)** yang di-deploy secara otomatis ke **Vercel**.

---

## 🔗 Akses & Preview Link

- **Vercel Production**: [https://easymall.ilhampradani.me/](https://easymall.ilhampradani.me/)
- **Development Server (Local/VPS)**: `http://166.0.112.212:4321/` (atau `http://localhost:4321/`)
- **API Endpoints**: `http://166.0.112.212:4321/api/products`

---

## 🛠️ Arsitektur & Teknologi

* **Frontend**: Astro 7, Vanilla CSS, Tailwind, responsive components.
* **Backend API**: Astro Serverless API Routes (`frontend/src/pages/api/*.ts`) diproses via `@astrojs/vercel`.
* **Vendor Integrasi**:
  * **KoalaStore API**: Katalog produk digital (streaming, software, subscription).
  * **Miracle Gaming API**: Katalog produk top-up game.
  * **BuatQRIS API**: Automatic QRIS payment gateway.
* **Deployment**: **100% Serverless di Vercel** (Bebas dari kebergantungan server VPS / PM2).

---

## 🗂️ Struktur Direktori

```
.
├── SISTEM_EASYMALL.md                  ← Master documentation & single source of truth
├── README.md                           ← Berkas petunjuk ini
├── vercel.json                         ← Konfigurasi Vercel deployment
└── frontend/                           ← Kode sumber utama aplikasi Astro
    ├── astro.config.mjs                ← Adapter @astrojs/vercel (output: 'server')
    ├── package.json                    ← Dependensi Astro & Vercel
    └── src/
        ├── pages/                      ← Halaman web (.astro)
        └── pages/api/                  ← Astro Serverless API Routes
            ├── products.ts             ← Katalog produk + auto markup 25%
            ├── db-products.ts          ← Database fallback produk
            ├── checkout.ts             ← Integrasi checkout BuatQRIS & KoalaStore
            ├── order/status/[id].ts    ← Cek status transaksi pembayaran
            ├── auth/status.ts          ← Status autentikasi sesi
            └── cart.ts                 ← Keranjang belanja
```

---

## 🚀 Cara Mengembangkan & Menjalankan (Development)

### 1. Menjalankan Dev Server Lokal
```bash
cd frontend
export PATH="/tmp/node-v22.12.0-linux-x64/bin:$PATH" # gunakan Node >= 22
npm run dev -- --host 0.0.0.0 --port 4321
```
Akses di browser: `http://localhost:4321` atau `http://<IP_SERVER>:4321`.

### 2. Menguji Build Vercel
```bash
cd frontend
npm run build
```

### 3. Deploy ke Production (Vercel)
Cukup commit & push ke branch `master` / `main` di GitHub:
```bash
git add .
git commit -m "Update fitur & API"
git push origin master
```
Vercel akan secara otomatis membangun aplikasi dan meng-update website dalam beberapa detik!
