import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGE_STATUS,
  ageStatusFromLabel,
  ageStatusLabel,
  classifyAge,
  cutoffDate,
} from '../src/age.js';

const NOW = new Date('2026-11-09T00:00:00.000Z');

test('label status usia mengikuti jumlah tahun minimum', () => {
  assert.equal(ageStatusLabel(AGE_STATUS.VERIFIED, 2), 'Usia terverifikasi (>= 2 tahun)');
  assert.equal(ageStatusLabel(AGE_STATUS.VERIFIED, 3), 'Usia terverifikasi (>= 3 tahun)');
  assert.equal(ageStatusLabel(AGE_STATUS.YOUNG, 3), 'Kemungkinan < 3 tahun');
  assert.equal(ageStatusLabel(AGE_STATUS.MANUAL), 'Perlu cek manual');
  assert.equal(ageStatusLabel(AGE_STATUS.UNKNOWN), 'Tidak dapat dipastikan');
});

test('label lama dapat dipetakan kembali ke kode status', () => {
  assert.equal(ageStatusFromLabel('Usia terverifikasi (>= 2 tahun)'), AGE_STATUS.VERIFIED);
  assert.equal(ageStatusFromLabel('Usia terverifikasi (>= 5 tahun)'), AGE_STATUS.VERIFIED);
  assert.equal(ageStatusFromLabel('Kemungkinan < 2 tahun'), AGE_STATUS.YOUNG);
  assert.equal(ageStatusFromLabel('Perlu cek manual'), AGE_STATUS.MANUAL);
  assert.equal(ageStatusFromLabel('Tidak dapat dipastikan'), AGE_STATUS.UNKNOWN);
  assert.equal(ageStatusFromLabel(''), null);
});

test('cutoff dihitung dari MIN_YEARS', () => {
  assert.equal(cutoffDate(NOW).toISOString().slice(0, 10), '2024-11-09');
});

test('sinyal lama menghasilkan status verified', () => {
  const age = classifyAge(
    [{ type: 'wayback', date: '2010-05-01', weight: 35 }],
    NOW,
  );
  assert.equal(age.status, AGE_STATUS.VERIFIED);
  assert.equal(age.statusLabel, 'Usia terverifikasi (>= 2 tahun)');
  assert.equal(age.confidence, 35);
  assert.equal(age.foundedYear, 2010);
  assert.equal(age.earliest.date, '2010-05-01');
});

test('dua sinyal baru dengan wayback/domain menghasilkan young', () => {
  const age = classifyAge(
    [
      { type: 'wayback', date: '2026-01-01', weight: 35 },
      { type: 'domain', date: '2026-02-01', weight: 25 },
    ],
    NOW,
  );
  assert.equal(age.status, AGE_STATUS.YOUNG);
  assert.equal(age.confidence, 0);
});

test('satu sinyal baru tanpa bukti wayback/domain masuk manual', () => {
  const age = classifyAge([{ type: 'reviews', date: '2026-03-01', weight: 30 }], NOW);
  assert.equal(age.status, AGE_STATUS.MANUAL);
});

test('tanpa sinyal masuk unknown', () => {
  const age = classifyAge([], NOW);
  assert.equal(age.status, AGE_STATUS.UNKNOWN);
  assert.equal(age.confidence, 0);
  assert.equal(age.foundedYear, null);
});

test('sinyal lama dan baru memakai sinyal paling awal serta bobot yang lolos cutoff', () => {
  const age = classifyAge(
    [
      { type: 'reviews', date: '2026-03-01', weight: 30 },
      { type: 'wayback', date: '2015-01-01', weight: 35 },
      { type: 'copyright', date: '2012-01-01', weight: 10 },
    ],
    NOW,
  );
  assert.equal(age.status, AGE_STATUS.VERIFIED);
  assert.equal(age.foundedYear, 2012);
  assert.equal(age.confidence, 45);
});
