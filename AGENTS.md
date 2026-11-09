# AGENTS.md — Surabaya Design Directory

Panduan kerja untuk Pi di project ini. Baca sebelum mengubah kode atau menjalankan pipeline.

## Ringkasan project

Direktori terbuka studio/agensi desain di Surabaya. Project terdiri dari dua bagian:

1. **Pipeline data** (`src/`): scrape Google Maps via Apify, filter relevansi, estimasi usia studio, ekspor Excel/CSV.
2. **Website** (`frontend/` + `site/`): React + Vite + Tailwind + komponen shadcn/ui. Landing page, peta direktori, dan admin lokal untuk mengedit `site/data/directory.json`. Build menghasilkan `dist/`.

Repo: `https://github.com/miazakii/design-directory-surabaya` (branch `main`).

## Struktur penting

| Path | Isi |
| --- | --- |
| `src/index.js` | Entry point pipeline scrape → filter → enrich → export |
| `src/config.js` | Keyword, filter relevansi, bobot sinyal usia, konfigurasi umum |
| `src/apify.js` | Pemanggilan Apify actor Google Maps |
| `src/enrich.js` | Bukti usia: Wayback, RDAP, copyright website |
| `src/age.js` | Perhitungan status usia, label dinamis, dan skor keyakinan |
| `src/data-quality.js` | Normalisasi nama/telepon/kota, ID stabil, deteksi duplikat |
| `src/dedupe.js` | Deduplikasi kandidat (placeId, telepon, koordinat + nama) |
| `src/cost.js` | Estimasi biaya run Apify |
| `src/validate-directory.js` | Validasi schema `directory.json` (dipakai admin, build, dan test) |
| `src/export.js` | Export Excel (sheet Studio, Semua Kandidat, Bukti Usia, Ringkasan, Log) |
| `data/` | Data hasil scrape, cache enrichment, Excel/CSV. **Tidak di-commit.** |
| `frontend/` | Source React (halaman, komponen shadcn/ui, Tailwind, aset font) |
| `frontend/src/components/ui/` | Komponen shadcn/ui (button, card, dialog, sheet, tabs, select, dll.) |
| `site/` | Aset statis: data kanonis, font, CSS halaman SEO, favicon, OG image |
| `dist/` | Output build Vite + halaman SEO. **Tidak di-commit.** |
| `site/data/directory.json` | Sumber data website; diedit lewat admin lokal |
| `site/scripts/validate-directory.js` | Validasi data website untuk CI |
| `site/scripts/build-seo.js` | Generator halaman studio, sitemap, robots |
| `site/scripts/check-data-quality.js` | Laporan duplikat & anomali data |
| `site/fonts/` | Font Host Grotesk self-host + lisensi OFL |
| `test/` | Unit + smoke test (`npm test`) |
| `admin-server.mjs` | Server admin lokal + commit/push (push bisa dimatikan) |
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
npm test               # unit + smoke test
npm run validate:site  # validasi schema directory.json
npm run check:data     # laporan duplikat & kualitas data
npm run dev            # dev server React di http://localhost:5173
npm run build          # build React + halaman SEO ke dist/
npm run build:web      # build React saja ke dist/
npm run build:seo      # halaman studio, sitemap, robots ke dist/
npm run preview        # preview hasil build
npm run serve:site     # build lalu preview di http://localhost:8000
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
11. Setelah mengubah kode pipeline, admin, atau data website, jalankan `npm test` dan `npm run validate:site`. Jangan deploy jika salah satu gagal.
12. Jangan mengedit manual `dist/` atau aset hasil build. Ubah source di `frontend/` lalu jalankan `npm run build`.
13. Setelah mengubah data website, jalankan `npm run build` agar halaman statis/sitemap ikut diperbarui.
14. MapLibre diimpor dari npm dan dibundel Vite; tidak ada `site/vendor` manual.

## Konteks user (dari preferensi sebelumnya)

- User lebih nyaman diberi perintah lengkap dengan `cd <project-dir>` karena sering menjalankan perintah dari home directory.
- User menghargai validasi end-to-end dengan data contoh sebelum mengeluarkan biaya API.
- User ingin melihat artefak nyata (file/log), bukan hanya ringkasan.
- Untuk masalah/error, user sering mengirim screenshot atau teks singkat; investigasi sendiri dulu sebelum meminta detail.
- Pengelolaan konten website disukai lewat admin dashboard berbasis browser, bukan edit JSON manual.

## Status migrasi

Project dipindahkan dari `~/Documents/AI/commandcode` ke folder project Pi ini pada 2026-11-09. Folder lama dibiarkan sebagai backup. Git history, `.env`, data hasil scrape, dan seluruh kode ikut dipindahkan.
