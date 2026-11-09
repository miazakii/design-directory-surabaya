import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findDuplicateGroups,
  reviewReasons,
  studioCompleteness,
} from '../frontend/src/lib/quality.js';

test('duplikat terdeteksi dari telepon dan domain', () => {
  const studios = [
    { id: 'a', name: 'Studio A', phone: '+62 31 1234567', website: 'https://studio-a.com' },
    { id: 'b', name: 'Studio A', phone: '+62 31 1234567', website: 'https://studio-a.com' },
  ];
  const groups = findDuplicateGroups(studios);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].studios.length, 2);
  assert.ok(groups[0].reasons.includes('telepon sama'));
});

test('domain generik tidak dianggap duplikat otomatis', () => {
  const studios = [
    { id: 'a', name: 'Studio A', website: 'https://instagram.com/studioa' },
    { id: 'b', name: 'Studio B', website: 'https://instagram.com/studiob' },
  ];
  assert.equal(findDuplicateGroups(studios).length, 0);
});

test('completeness menghitung field penting yang kosong', () => {
  const result = studioCompleteness({
    name: 'Studio A',
    group: 'agency',
    address: 'Jl. Contoh',
    city: 'Surabaya',
    phone: '031',
    website: '',
    latitude: null,
    longitude: null,
    ageStatusCode: 'verified',
    ageSummary: '',
    evidenceUrl: '',
  });
  assert.equal(result.total, 10);
  assert.equal(result.score, 6);
  assert.ok(result.missing.includes('Website'));
  assert.ok(result.missing.includes('Koordinat'));
});

test('review reasons menandai data yang belum lengkap', () => {
  const reasons = reviewReasons({
    name: 'Studio A',
    ageStatusCode: 'manual',
    outsideSurabaya: true,
    phone: '',
    website: '',
    latitude: null,
    longitude: null,
  });
  assert.ok(reasons.includes('Usia perlu dicek'));
  assert.ok(reasons.includes('Di luar Surabaya'));
  assert.ok(reasons.includes('Belum ada kontak'));
  assert.ok(reasons.includes('Belum ada koordinat'));
  assert.ok(reasons.includes('Belum terverifikasi'));
});
