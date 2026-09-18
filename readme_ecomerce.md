# 📘 EasyMall System Documentation (Legacy Overview & Migration Note)

> ⚠️ **CATATAN MIGRASI ARSITEKTUR (September 2026):**
> Arsitektur EasyMall telah diperbarui dari Flask/Rust VPS menjadi **Astro Serverless API Routes** yang berjalan 100% di **Vercel**.
> Untuk dokumentasi terkini, silakan merujuk pada:
> 1. **[`README.md`](file:///root/ecomerce/README.md)** - Panduan cepat & link preview
> 2. **[`SISTEM_EASYMALL.md`](file:///root/ecomerce/SISTEM_EASYMALL.md)** - Dokumentasi arsitektur master

---

## 1. Ikhtisar Arsitektur Saat Ini (Vercel Serverless)

- **Frontend**: Astro 7 (TypeScript + HTML5 + CSS3).
- **Serverless API Routes**: Berlokasi di [`frontend/src/pages/api/`](file:///root/ecomerce/frontend/src/pages/api/).
  - `products.ts`: Fetch KoalaStore & Miracle Gaming dengan auto markup.
  - `checkout.ts`: Integrasi pembayaran QRIS via BuatQRIS & KoalaStore.
  - `order/status/[transaction_id].ts`: Polling status transaksi.
- **Preview Link (VPS Dev Server)**: `http://166.0.112.212:4321/`
- **Production Link (Vercel)**: `https://easymall.ilhampradani.me/`

---

## 2. Riwayat Arsitektur Lama (Flask / Rust VPS)

*Dulu (arsitektur lama) sistem berjalan menggunakan service Rust/Flask di port 5002 dengan PM2 dan Apache Reverse Proxy `api.ilhampradani.me`. Sistem tersebut kini telah sepenuhnya digantikan oleh Vercel Serverless Functions di Astro.*
