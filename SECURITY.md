# Security Policy

## Melaporkan masalah keamanan

Jangan membuka issue publik untuk masalah keamanan yang belum diperbaiki.
Gunakan fitur **Report a vulnerability** di tab Security repository GitHub, atau hubungi pemilik repository secara privat.

## Catatan untuk admin lokal

- `npm run admin` hanya bind ke `127.0.0.1`.
- Token admin disimpan di `.admin-token` (mode `0600`) dan tidak boleh di-commit.
- Jangan pernah menjalankan admin server di interface publik.
- Simpan perubahan akan commit hanya `site/data/directory.json`; push dapat dimatikan dengan `ADMIN_AUTO_PUSH=false`.
- Jika token bocor, hapus `.admin-token` lalu jalankan ulang `npm run admin` untuk membuat token baru.
