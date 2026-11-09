import test from 'node:test';
import assert from 'node:assert/strict';
import { isHexColor, validateDirectory } from '../src/validate-directory.js';
import { AGE_STATUS } from '../src/age.js';

function validDirectory() {
  return {
    title: 'Design Directory Surabaya',
    minYears: 2,
    groups: [
      { key: 'agency', label: 'Agensi Desain', color: '#E63946' },
      { key: 'other', label: 'Lainnya', color: '#8D99AE' },
    ],
    notes: ['Catatan contoh'],
    studios: [
      {
        id: 'p1',
        name: 'Studio A',
        group: 'agency',
        ageStatusCode: AGE_STATUS.VERIFIED,
        ageStatus: 'Usia terverifikasi (>= 2 tahun)',
        emails: ['halo@example.com'],
        openingHours: ['Senin: 09.00–17.00'],
        rating: 4.8,
        latitude: -7.2,
        longitude: 112.7,
      },
    ],
  };
}

test('direktori valid tidak menghasilkan error', () => {
  assert.deepEqual(validateDirectory(validDirectory()), []);
});

test('warna harus format hex enam digit', () => {
  assert.equal(isHexColor('#A1B2C3'), true);
  assert.equal(isHexColor('#abc'), false);
  assert.equal(isHexColor('red'), false);
});

test('key kategori dan id studio duplikat ditolak', () => {
  const data = validDirectory();
  data.groups.push({ key: 'agency', label: 'Duplikat', color: '#123456' });
  data.studios.push({ ...data.studios[0], name: 'Studio B' });
  const errors = validateDirectory(data);
  assert.ok(errors.some((error) => error.includes('key duplikat')));
  assert.ok(errors.some((error) => error.includes('id duplikat')));
});

test('kode status usia yang tidak dikenal ditolak', () => {
  const data = validDirectory();
  data.studios[0].ageStatusCode = 'lama';
  const errors = validateDirectory(data);
  assert.ok(errors.some((error) => error.includes('ageStatusCode')));
});

test('rating dan koordinat di luar rentang ditolak', () => {
  const data = validDirectory();
  data.studios[0].rating = 8;
  data.studios[0].latitude = -100;
  data.studios[0].longitude = 200;
  const errors = validateDirectory(data);
  assert.ok(errors.some((error) => error.includes('rating')));
  assert.ok(errors.some((error) => error.includes('latitude')));
  assert.ok(errors.some((error) => error.includes('longitude')));
});

test('array emails dan openingHours wajib berupa array', () => {
  const data = validDirectory();
  data.studios[0].emails = 'halo@example.com';
  data.studios[0].openingHours = 'Senin';
  const errors = validateDirectory(data);
  assert.ok(errors.some((error) => error.includes('emails')));
  assert.ok(errors.some((error) => error.includes('openingHours')));
});
