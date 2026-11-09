# AGENTS.md — Surabaya Design Directory

Panduan kerja untuk Pi di project ini. Baca sebelum mengubah kode atau menjalankan pipeline.

## Ringkasan project

Direktori terbuka studio/agensi desain di Surabaya. Project terdiri dari dua bagian:

1. **Pipeline data** (`src/`): scrape Google Maps via Apify, filter relevansi, estimasi usia studio, ekspor Excel/CSV.
2. **Website statis** (`site/`): landing page, peta direktori, dan admin lokal untuk mengedit `site/data/directory.json`.

Repo: `https://github.com/miazakii/design-directory-surabaya` (branch `main`).

## Struktur penting

| Path | Isi |
| --- | --- |
| `src/index.js` | Entry point pipeline scrape → filter → enrich → export |
| `src/config.js` | Keyword, filter relevansi, bobot sinyal usia, konfigurasi umum |
| `src/apify.js` | Pemanggilan Apify actor Google Maps |
| `src/enrich.js` | Bukti usia: Wayback, RDAP, copyright website |
| `src/age.js` | Perhitungan status usia dan skor keyakinan |
| `src/export.js` | Export Excel (sheet Studio, Semua Kandidat, Bukti Usia, Ringkasan, Log) |
| `data/` | Data hasil scrape, cache enrichment, Excel/CSV. **Tidak di-commit.** |
| `site/` | Website statis yang di-deploy ke GitHub Pages/Netlify |
| `site/data/directory.json` | Sumber data website; diedit lewat admin lokal |
| `admin-server.mjs` | Server admin lokal + commit/push otomatis ke `origin main` |
| `fixtures/sample-places.json` | Data contoh untuk uji offline tanpa biaya Apify |
| `workshop-modeling/` | Materi workshop (HTML + rundown), bukan bagian pipeline |

## Perintah utama

```bash
cd ~/Documents/pi/pi-project/surabaya-design-directory

npm ci                 # install dependency dari lockfile
npm run demo           # uji pipeline offline, TIDAK memakai kredit Apify
npm start              # scrape sungguhan (butuh APIFY_TOKEN, berbayar)
npm run build:site     # aman: menolak menimpa directory.json yang sudah ada
npm run import:csv     # rebuild eksplisit dari CSV + backup otomatis
npm run admin          # admin lokal (bind 127.0.0.1, butuh token dari terminal)
npm run serve:site     # preview website di http://localhost:8000
```

Untuk uji demo tanpa mengotori folder project:

```bash
OUTPUT_FILE=/tmp/demo-surabaya.xlsx node src/index.js --input fixtures/sample-places.json
```

## Aturan kerja

1. **Jangan memanggil Apify/API berbayar tanpa izin eksplisit user.** Mulai dari `fixtures/` atau `npm run demo`. Jika perlu run berbayar, jelaskan perkiraan biaya dan minta konfirmasi.
2. **Jangan commit `.env`, `.admin-token`, `data/`, `node_modules/`, atau file `.DS_Store`.** Semua sudah ada di `.gitignore`; jangan hapus aturan tersebut.
3. **`site/data/directory.json` adalah sumber data kanonis website.** Jangan jalankan `npm run import:csv` tanpa izin karena perintah itu mengganti seluruh daftar studio dari CSV (groups/notes dipertahankan, backup dibuat). `npm run build:site` sengaja menolak menimpa file yang sudah ada.
4. **Hati-hati dengan `npm run admin`.** Server hanya bind `127.0.0.1` dan API butuh token dari URL terminal. `POST /api/directory` menulis file, commit hanya `site/data/directory.json`, lalu push ke `origin main` (kecuali `ADMIN_AUTO_PUSH=false`). Jangan uji POST tanpa izin; untuk uji baca gunakan token dari `.admin-token`.
5. **Pertahankan data yang belum terverifikasi.** Baris "Perlu cek manual" tetap ditampilkan dengan label, bukan dibuang, demi transparansi.
6. **Sinyal usia adalah batas bawah**, bukan tanggal berdiri. Jangan ubah logika menjadi klaim tanggal pasti tanpa bukti.
7. **Gunakan Bahasa Indonesia** untuk komunikasi, dokumentasi, dan komentar yang menghadap user.
8. Sebelum mengubah perilaku pipeline/filter, cek dampaknya ke `README.md` dan sheet `Semua Kandidat` agar hasil tetap bisa diaudit.
9. Untuk perubahan UI, prioritaskan tooling gratis (Leaflet/MapLibre + OpenStreetMap/OpenFreeMap) dan hindari layanan berbayar/API key bila versi gratis cukup.
10. Jika user memberi brief panjang, kerjakan langsung dengan default yang wajar; jika ada keputusan besar/ambigu, ajukan pilihan eksplisit sebelum implementasi.

## Konteks user (dari preferensi sebelumnya)

- User lebih nyaman diberi perintah lengkap dengan `cd <project-dir>` karena sering menjalankan perintah dari home directory.
- User menghargai validasi end-to-end dengan data contoh sebelum mengeluarkan biaya API.
- User ingin melihat artefak nyata (file/log), bukan hanya ringkasan.
- Untuk masalah/error, user sering mengirim screenshot atau teks singkat; investigasi sendiri dulu sebelum meminta detail.
- Pengelolaan konten website disukai lewat admin dashboard berbasis browser, bukan edit JSON manual.

## Status migrasi

Project dipindahkan dari `~/Documents/AI/commandcode` ke folder project Pi ini pada 2026-11-09. Folder lama dibiarkan sebagai backup. Git history, `.env`, data hasil scrape, dan seluruh kode ikut dipindahkan.
