# Studio Desain/Branding Surabaya — Scraper & Qualifier

Kumpulkan **100 studio desain/branding di Surabaya yang sudah berdiri >= 2 tahun**, lengkap dengan kontak, sosial media, dan bukti usia, lalu ekspor ke satu file Excel.

Sumber data: Apify actor `compass/crawler-google-places` (Google Maps Scraper).

## Masalah utama & cara mengatasinya

Google Places/Maps **tidak menyediakan tanggal berdiri**. Jadi usia tidak bisa diambil langsung, melainkan diestimasi dari sinyal proxy:

| Sinyal | Cara ambil | Bobot | Arti |
| --- | --- | --- | --- |
| Review Google tertua | `reviews[].publishedAtDate` dari actor (butuh `maxReviews > 0`) | 30 | Tempat itu sudah menerima review sejak tanggal tsb |
| Arsip website | Wayback Machine CDX API (gratis) | 35 | Domain aktif & terarsip sejak tanggal tsb |
| Registrasi domain | RDAP `rdap.org` (gratis) | 25 | Domain didaftarkan pada tanggal tsb |
| Copyright website | Regex footer halaman utama | 10 | Tahun copyright paling awal di website |

Semua sinyal bersifat **"sudah ada setidaknya sejak X"**. Sinyal paling awal dipakai sebagai batas bawah usia.

**Status usia:**

- `Usia terverifikasi (>= 2 tahun)` — ada minimal satu sinyal yang lebih tua dari batas cutoff.
- `Kemungkinan < 2 tahun` — >= 2 sinyal ada tapi semuanya lebih baru dari cutoff (dan mencakup wayback/domain). Dibuang dari daftar utama.
- `Perlu cek manual` — ada sinyal, tapi tidak ada yang cukup tua untuk membuktikan.
- `Tidak dapat dipastikan` — tidak ada sinyal sama sekali (biasanya tanpa website & tanpa review).

Skor keyakinan = jumlah bobot sinyal yang lebih tua dari cutoff (maks 100), dipakai untuk mengurutkan.

## Prasyarat

- Node.js >= 18
- API token Apify (https://console.apify.com/settings/integrations)

## Setup

```bash
npm install
cp .env.example .env
# isi APIFY_TOKEN di .env
```

## Cara menjalankan

```bash
# 1. Uji pipeline offline dengan data contoh (TIDAK memakai kredit Apify)
npm run demo

# 2. Jalankan scrape sungguhan
npm start
```

Hasil ada di `data/studio-desain-surabaya.xlsx`. Data mentah setiap run disimpan di `data/raw-<timestamp>.json` sehingga bisa diproses ulang tanpa scrape:

```bash
node src/index.js --input data/raw-2026-10-22T14-39-10-786Z.json
```

Beberapa hasil run bisa digabung (dipisah koma) — berguna kalau mau menambah keyword di run terpisah tanpa mengulang yang lama:

```bash
node src/index.js --input data/raw-run1.json,data/raw-run2.json
```

Proses ulang tidak memanggil Apify dan memakai cache enrichment di `data/enrich-cache.json`, jadi hasilnya konsisten dan cepat (tidak menghajar Wayback Machine/RDAP berulang kali).

## Opsi CLI

| Opsi | Fungsi |
| --- | --- |
| `--input <file[,file]>` | Pakai JSON hasil scrape sebelumnya (satu atau beberapa file, dipisah koma), lewati Apify |
| `--limit <n>` | Jumlah studio yang diinginkan di sheet Studio (default 100) |
| `--max-per-search <n>` | Batas place per keyword (default 40) |
| `--keywords "a,b,c"` | Ganti daftar keyword pencarian |
| `--no-enrich` | Lewati pengumpulan bukti usia (jauh lebih cepat, semua jadi "Tidak dapat dipastikan") |

## Isi file Excel

| Sheet | Isi |
| --- | --- |
| `Studio` | Daftar final (target 100), terurut: terverifikasi dulu, lalu skor keyakinan tertinggi |
| `Semua Kandidat` | Semua hasil dedupe + alasan lolos/tidak filter relevansi, supaya bisa diaudit |
| `Bukti Usia` | Satu baris per sinyal: tanggal, detail, bobot, apakah dihitung ke skor, link bukti |
| `Ringkasan` | Statistik run + apakah target 100 terpenuhi |
| `Log` | Konfigurasi run (actor, run id, keyword, batas) |

Kolom penting di sheet `Studio`: `Status Usia`, `Skor Keyakinan`, `Estimasi Tahun Berdiri`, `Usia (tahun)`, `Sinyal Usia`, `Bukti Utama` (link ke Wayback/RDAP/Google Maps).

## Filter relevansi

Keyword pencarian sudah diarahkan ke studio desain/branding, lalu disaring lagi berdasarkan kategori & nama:

- **Istilah wajib** (salah satu): `branding`, `desain`, `design`, `grafis`, `graphic`, `kreatif`, `creative`, `visual`, `identitas`, `agency`, `studio`, `advertising`, dll.
- **Istilah pengecualian**: `percetakan`, `digital printing`, `fotokopi`, `sablon`, `konveksi`, `fotografi`, `wedding`, `laundry`, dll.

Ubah daftarnya di `src/config.js` (`relevance.include` / `relevance.exclude`). Kandidat yang gagal filter tetap terlihat di sheet `Semua Kandidat` beserta alasannya.

## Kalau target 100 belum terpenuhi

1. Tambah keyword di `config.searchStrings` (mis. `desain interior`, `packaging designer`, `agency digital`).
2. Naikkan `--max-per-search` (default 120; actor menyarankan jangan gabung lokasi ke keyword).
3. Aktifkan review (`MAX_REVIEWS`) agar sinyal usia lebih banyak — ini yang paling berpengaruh.
4. Pakai sheet `Semua Kandidat` untuk mengambil baris berstatus "Perlu cek manual" yang ingin diverifikasi manual.

## Hasil run terakhir (2026-10-22)

| Tahap | Jumlah |
| --- | --- |
| Place di-scrape (12 keyword x 40) | 440 |
| Unik setelah dedupe | 440 |
| Lolos filter relevansi & belum tutup | 129 |
| Usia terverifikasi (>= 2 tahun) | 91 |
| Masuk sheet `Studio` | 100 (91 terverifikasi + 9 ditandai) |
| Biaya run | $8.10 (cap $10) |

Target 100 baris terpenuhi, tapi **91 di antaranya** yang benar-benar terverifikasi usia. 9 baris sisanya berstatus "Perlu cek manual" (semuanya berdiri 2025-2026) dan tetap disertakan sambil ditandai — bukan disembunyikan. Sheet `Ringkasan` menuliskan kondisi ini sebagai "Sebagian (ada baris belum terverifikasi)".

## Keterbatasan yang diketahui

1. **Kategori Google sangat longgar.** Banyak tempat memberi diri sendiri kategori "Agensi desain"/"Perancang Grafis" padahal bukan. Filter di `src/config.js` sudah menyaring vertikal yang jelas berbeda (kampus, apartemen, percetakan, properti, pemasok, interior, arsitek, marketing), tapi ekor panjangnya tidak mungkin habis dengan daftar kata.
2. **Biro iklan ikut masuk.** Sekitar 10 dari 91 baris berkategori `Biro Iklan` / `Jasa Periklanan`. Kategorinya berdekatan dengan agensi branding. Kalau tidak diinginkan, tambahkan `'biro iklan'`, `'periklanan'`, `'advertising'` ke `relevance.mismatch`.
3. **Sebagian agensi branding tidak punya website** sehingga tidak punya sinyal domain/Wayback/copyright. Sekitar 34 dari 100 baris tanpa kontak digital sama sekali (hanya telepon).
4. **Dua studio dengan nama hampir sama bisa muncul dua kali** kalau `placeId`-nya berbeda dan alamatnya ditulis berbeda (dedupe memakai `placeId`, fallback nama+alamat).
5. **Sinyal usia adalah batas bawah, bukan tanggal berdiri.** "Terarsip sejak 2009" berarti ada bukti aktivitas sejak 2009, bukan berarti perusahaan berdiri tepat 2009.

## Estimasi biaya Apify (angka nyata dari pilot)

Actor ini pay-per-event. Harga per event (dicek 2026-10-22):

| Event | Harga | Catatan |
| --- | --- | --- |
| place-scraped | $0.004 | per place berhasil di-scrape |
| filter-applied | $0.001 | per place per filter (mis. `skipClosedPlaces`) |
| place-details-scraped | $0.002 | per place, wajib kalau mengambil review |
| contact-details-scraped | $0.002 | per place yang punya website |
| review-scraped | $0.0005 | **per review — ini biaya terbesar** |

**Hasil pilot nyata** (2 keyword x 30 place, `MAX_REVIEWS=50`, contacts aktif):

| Metrik | Nilai |
| --- | --- |
| Place | 60 |
| Review terkumpul | 1.240 |
| Total biaya | **$1.106** |
| Porsi biaya review | $0.62 (56%) |
| Hasil akhir | 42 relevan, 27 terverifikasi usia, 39 masuk daftar final |

Tingkat verifikasi usia ≈ 64% dari kandidat relevan. Untuk mencapai 100 studio terverifikasi:

| Skenario | Perkiraan biaya |
| --- | --- |
| 12 keyword x 40 place (~480 place) + review | **$8-10** |
| 12 keyword x 120 place (~1.440 place) + review | **$25-30** (kena cap default actor $9.99) |
| 12 keyword x 40 place tanpa review | ~$3, tapi verifikasi turun karena kehilangan sinyal terkuat |

**Aktual:** pilot $1.11 + run penuh $8.10 = **$9.21** total.

`MAX_TOTAL_CHARGE_USD` (default 10) membatasi biaya per run. Kalau cap tercapai, actor berhenti dan pipeline tetap memproses data yang sudah terkumpul — status & biaya tercatat di sheet `Ringkasan`.

`MAX_REVIEWS=0` berarti tidak ada review yang diambil: termurah, tapi studio yang tidak punya website akan jatuh ke "Perlu cek manual".

## Catatan legal & privasi

- Actor ini menyalin halaman publik Google Maps; perhatikan Google Terms of Use dan privasi orang.
- `scrapeReviewsPersonalData` sengaja dimatikan: hanya tanggal review yang diambil, bukan identitas pemberi review.
- Email dan nama yang terkumpul termasuk data pribadi. Pakai hanya dengan dasar yang sah (mis. penawaran bisnis B2B) dan sediakan cara opt-out.
- `.env` dan folder `data/` sudah masuk `.gitignore` — token dan data hasil scrape tidak ikut ter-commit.

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `APIFY_TOKEN belum diisi` | Belum ada `.env` atau token kosong |
| Run sangat lama | `maxReviews` besar memperlambat run; naikkan `RUN_TIMEOUT_SECS` |
| Semua statusnya "Perlu cek manual" | Kebanyakan studio tidak punya website; aktifkan `MAX_REVIEWS` |
| `Situs terarsip sejak` tidak muncul | Domain sangat baru / belum pernah diarsipkan, atau Wayback sedang lambat |
| Sinyal domain kosong untuk domain `.id` | TLD `.id` sering tidak terdaftar di RDAP; pakai sinyal lain |
| Sinyal Wayback hilang semua | IP kena HTTP 429 karena CDX API dipanggil terlalu sering. Tunggu beberapa menit; cache di `data/enrich-cache.json` mencegah ini terulang |
| Hasil berubah tiap reproses | Enrichment memanggil API gratis yang bisa rate-limit. Cache membuat hasil konsisten; hapus cache hanya kalau memang ingin memperbarui data |
| Hasil run terpotong | Cap `MAX_TOTAL_CHARGE_USD` tercapai; pipeline tetap memproses data yang sudah terkumpul |
