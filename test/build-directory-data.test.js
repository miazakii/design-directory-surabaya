import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDataNotes, normalizeRow, parseDelimited } from '../site/scripts/build-directory-data.js';
import { AGE_STATUS } from '../src/age.js';

test('parseDelimited mendukung delimiter, quote, dan newline dalam sel', () => {
  const csv = 'Nama;Alamat;Catatan\n"Studio A";"Jl. Contoh; No. 1";"baris satu\nbaris dua"\n';
  assert.deepEqual(parseDelimited(csv, ';'), [
    ['Nama', 'Alamat', 'Catatan'],
    ['Studio A', 'Jl. Contoh; No. 1', 'baris satu\nbaris dua'],
  ]);
});

test('normalizeRow memetakan status usia lama ke kode dan label dinamis', () => {
  const row = normalizeRow(
    {
      'Nama Studio': 'Studio A',
      'Kategori Utama': 'Agensi desain',
      'Place ID': 'p1',
      'Status Usia': 'Usia terverifikasi (>= 2 tahun)',
      Kota: 'Kota Surabaya',
      'Jam Buka': 'Senin: 09.00–17.00; Selasa: 09.00–17.00',
      Rating: '4,8',
      'Jumlah Review': '12',
      Latitude: '-7,2',
      Longitude: '112,7',
      Email: 'a@example.com; b@example.com',
      Website: 'https://www.studio-a.id',
    },
    0,
  );

  assert.equal(row.id, 'p1');
  assert.equal(row.domain, 'studio-a.id');
  assert.equal(row.group, 'agency');
  assert.equal(row.ageStatusCode, AGE_STATUS.VERIFIED);
  assert.equal(row.ageStatus, 'Usia terverifikasi (>= 2 tahun)');
  assert.equal(row.needsReview, false);
  assert.equal(row.outsideSurabaya, false);
  assert.equal(row.rating, 4.8);
  assert.equal(row.reviews, 12);
  assert.equal(row.latitude, -7.2);
  assert.deepEqual(row.emails, ['a@example.com', 'b@example.com']);
  assert.equal(row.openingHours.length, 2);
});

test('normalizeRow menandai kota di luar Surabaya dan status manual', () => {
  const row = normalizeRow(
    {
      'Nama Studio': 'Studio B',
      'Kategori Utama': 'Perancang Grafis',
      'Place ID': 'p2',
      'Status Usia': 'Perlu cek manual',
      Kota: 'Kabupaten Gresik',
    },
    1,
  );

  assert.equal(row.group, 'visual');
  assert.equal(row.ageStatusCode, AGE_STATUS.MANUAL);
  assert.equal(row.needsReview, true);
  assert.equal(row.outsideSurabaya, true);
});

test('kota kosong tidak otomatis dianggap di luar Surabaya', () => {
  const row = normalizeRow(
    {
      'Nama Studio': 'Studio C',
      'Kategori Utama': 'Lainnya',
      'Place ID': 'p3',
      'Status Usia': '',
      Kota: '',
    },
    2,
  );
  assert.equal(row.outsideSurabaya, false);
});

test('baris tanpa Place ID mendapat ID stabil', () => {
  const row = normalizeRow(
    {
      'Nama Studio': 'Studio Tanpa ID',
      'Kategori Utama': 'Agensi desain',
      Alamat: 'Jl. Contoh No. 1',
      'Status Usia': '',
    },
    9,
  );
  assert.match(row.id, /^row-[0-9a-f]{16}$/);
  assert.equal(row.id, normalizeRow({
    'Nama Studio': 'Studio Tanpa ID',
    'Kategori Utama': 'Agensi desain',
    Alamat: 'Jl. Contoh No. 1',
    'Status Usia': '',
  }, 99).id);
});

test('catatan data dibuat dari kondisi aktual', () => {
  const records = [
    {
      id: 'a',
      name: 'VisualCast',
      domain: 'visual-cast.com',
      city: 'Surabaya',
      phone: '',
      website: 'https://visual-cast.com',
      emails: [],
      instagram: '',
      facebook: '',
      linkedin: '',
      needsReview: false,
      outsideSurabaya: false,
      latitude: -7.28,
      longitude: 112.69,
    },
    {
      id: 'b',
      name: 'VisualCast Design',
      domain: 'visual-cast.com',
      city: 'Kabupaten Gresik',
      phone: '',
      website: '',
      emails: [],
      instagram: '',
      facebook: '',
      linkedin: '',
      needsReview: true,
      outsideSurabaya: true,
      latitude: -7.27,
      longitude: 112.69,
    },
  ];
  const notes = buildDataNotes(records);
  assert.ok(notes.some((note) => note.includes('Kemungkinan duplikat: VisualCast')));
  assert.ok(notes.some((note) => note.includes('di luar Kota Surabaya')));
  assert.ok(notes.some((note) => note.includes('belum terverifikasi usia')));
  assert.ok(notes.some((note) => note.includes('batas bawah aktivitas')));
});
