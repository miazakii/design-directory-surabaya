# Contributing

Terima kasih sudah membantu Design Directory Surabaya.

## Menjalankan project

```bash
cd ~/Documents/pi/pi-project/surabaya-design-directory
npm ci
npm test
npm run validate:site
npm run build
npm run serve:site
```

Buka `http://localhost:8000`. Untuk pengembangan UI, jalankan `npm run dev` dan buka `http://localhost:5173`.

## Sebelum membuka pull request

Jalankan:

```bash
npm test
npm run validate:site
npm run check:data
```

Jika mengubah data website, jalankan juga:

```bash
npm run build
```

## Aturan data

- Jangan menambahkan data pribadi yang tidak relevan dengan direktori usaha.
- Jangan menghapus baris yang belum terverifikasi hanya agar terlihat rapi; tandai dengan status yang benar.
- Untuk koreksi/penghapusan data, gunakan formulir issue “Koreksi atau Penghapusan Data”.
- Jangan commit `.env`, `.admin-token`, `data/`, atau file hasil scrape.
- Jangan mengedit `dist/` secara manual. Ubah source React di `frontend/` lalu jalankan `npm run build`.
- MapLibre dibundel oleh Vite; tidak ada folder vendor manual.

## Gaya kode

- JavaScript ESM, Node >= 18.
- UI memakai React, Vite, Tailwind CSS, dan komponen shadcn/ui di `frontend/src/components/ui/`.
- Gunakan Bahasa Indonesia untuk teks yang dilihat pengguna.
- Tambahkan test untuk perubahan logika pipeline atau validasi data.
- Jaga agar `npm test` dan `npm run validate:site` tetap hijau.
