import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ageStatusFromLabel,
  ageStatusLabel,
  makeNewStudio,
  normalizeStudio,
  validateData,
} from '../frontend/src/lib/admin.js';
import { hasContact, isVerified, ratingText, safeColor, safeUrl } from '../frontend/src/lib/directory.js';

const baseData = {
  minYears: 3,
  groups: [{ key: 'agency', label: 'Agensi', color: '#E63946' }],
  studios: [
    {
      id: 'a',
      name: 'Studio A',
      group: 'agency',
      emails: [' a@example.com ', ''],
      openingHours: ['Senin: 09.00–17.00', ''],
      ageStatusCode: 'manual',
    },
  ],
  notes: [],
};

test('label status usia mengikuti minYears', () => {
  assert.equal(ageStatusLabel('verified', 3), 'Usia terverifikasi (>= 3 tahun)');
  assert.equal(ageStatusLabel('young', 5), 'Kemungkinan < 5 tahun');
  assert.equal(ageStatusLabel('manual', 3), 'Perlu cek manual');
  assert.equal(ageStatusLabel('unknown', 3), 'Tidak dapat dipastikan');
});

test('label status usia lama bisa dipetakan kembali ke kode', () => {
  assert.equal(ageStatusFromLabel('Usia terverifikasi (>= 2 tahun)'), 'verified');
  assert.equal(ageStatusFromLabel('Kemungkinan < 3 tahun'), 'young');
  assert.equal(ageStatusFromLabel('Perlu cek manual'), 'manual');
  assert.equal(ageStatusFromLabel('Tidak dapat dipastikan'), 'unknown');
  assert.equal(ageStatusFromLabel(''), '');
});

test('normalizeStudio membersihkan array dan menyinkronkan status', () => {
  const studio = normalizeStudio(baseData.studios[0], baseData);
  assert.deepEqual(studio.emails, ['a@example.com']);
  assert.deepEqual(studio.openingHours, ['Senin: 09.00–17.00']);
  assert.equal(studio.ageStatus, 'Perlu cek manual');
  assert.equal(studio.needsReview, true);
});

test('validateData menerima data minimal yang valid', () => {
  assert.deepEqual(validateData(baseData), []);
});

test('validateData menolak key kategori dan id studio duplikat', () => {
  const data = {
    ...baseData,
    groups: [
      { key: 'agency', label: 'Agensi', color: '#E63946' },
      { key: 'agency', label: 'Agensi 2', color: '#457B9D' },
    ],
    studios: [
      { ...baseData.studios[0], id: 'same' },
      { ...baseData.studios[0], id: 'same' },
    ],
  };
  const errors = validateData(data);
  assert.ok(errors.some((error) => error.includes('Key kategori duplikat')));
  assert.ok(errors.some((error) => error.includes('ID duplikat')));
});

test('validateData menolak rating dan koordinat di luar rentang', () => {
  const data = {
    ...baseData,
    studios: [{ ...baseData.studios[0], rating: 6, latitude: 95, longitude: 200 }],
  };
  const errors = validateData(data);
  assert.ok(errors.some((error) => error.includes('rating harus 0–5')));
  assert.ok(errors.some((error) => error.includes('latitude harus')));
  assert.ok(errors.some((error) => error.includes('longitude harus')));
});

test('makeNewStudio memakai kategori pertama dan field wajib', () => {
  const studio = makeNewStudio(baseData);
  assert.match(studio.id, /^new-\d+$/);
  assert.equal(studio.group, 'agency');
  assert.equal(studio.city, 'Surabaya');
  assert.deepEqual(studio.emails, []);
});

test('helper direktori menangani URL, warna, kontak, dan rating', () => {
  assert.equal(safeUrl('example.com'), 'https://example.com');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeColor('#abc'), '#8D99AE');
  assert.equal(safeColor('#AABBCC'), '#AABBCC');
  assert.equal(isVerified({ ageStatusCode: 'verified' }), true);
  assert.equal(hasContact({ emails: ['a@example.com'] }), true);
  assert.equal(hasContact({ phone: '' }), false);
  assert.equal(ratingText({ rating: 4.8, reviews: 50 }), '4,8 (50)');
});
