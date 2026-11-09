import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findPossibleDuplicates,
  isGenericDomain,
  isSurabayaCity,
  nameSimilarity,
  normalizeName,
  normalizePhone,
  stableId,
} from '../src/data-quality.js';

test('normalisasi nama, telepon, dan kota', () => {
  assert.equal(normalizeName('  Studio  Desain!! '), 'studio desain');
  assert.equal(normalizePhone('+62 31-734-3469'), '62317343469');
  assert.equal(isSurabayaCity('Kota Surabaya'), true);
  assert.equal(isSurabayaCity('Surabaya'), true);
  assert.equal(isSurabayaCity('Kabupaten Gresik'), false);
  assert.equal(isSurabayaCity(''), false);
});

test('domain generik tidak dipakai sebagai sinyal duplikat', () => {
  assert.equal(isGenericDomain('instagram.com'), true);
  assert.equal(isGenericDomain('www.facebook.com'), true);
  assert.equal(isGenericDomain('studio-a.id'), false);
});

test('stableId deterministik dan berbeda untuk entitas berbeda', () => {
  assert.equal(stableId('Studio A', 'Jl. Contoh'), stableId('studio a', 'jl contoh'));
  assert.notEqual(stableId('Studio A', 'Jl. Contoh'), stableId('Studio B', 'Jl. Contoh'));
});

test('nameSimilarity menangani nama sama, terkandung, dan token overlap', () => {
  assert.equal(nameSimilarity('VisualCast', 'VisualCast Design'), 0.9);
  assert.equal(nameSimilarity('Studio A', 'Studio A'), 1);
  assert.ok(nameSimilarity('Studio Desain A', 'Studio Grafis A') > 0);
  assert.equal(nameSimilarity('', 'Studio'), 0);
});

test('deteksi duplikat dari telepon, domain, dan koordinat', () => {
  const studios = [
    {
      id: 'a',
      name: 'Studio Alpha',
      phone: '+62 31 111 222',
      domain: 'studio-alpha.id',
      latitude: -7.25,
      longitude: 112.75,
    },
    {
      id: 'b',
      name: 'Studio Alpha Copy',
      phone: '+62 31 111 222',
      domain: 'studio-alpha.id',
      latitude: -7.25,
      longitude: 112.75,
    },
    {
      id: 'c',
      name: 'VisualCast',
      phone: '+62 818 585 188',
      domain: 'visual-cast.com',
      latitude: -7.2822675,
      longitude: 112.6988834,
    },
    {
      id: 'd',
      name: 'VisualCast Design',
      phone: '+62 31 734 3469',
      domain: 'visual-cast.com',
      latitude: -7.2756721,
      longitude: 112.6962121,
    },
  ];

  const groups = findPossibleDuplicates(studios);
  assert.equal(groups.length, 2);
  assert.ok(groups.some((group) => group.ids.includes('a') && group.ids.includes('b')));
  assert.ok(groups.some((group) => group.ids.includes('c') && group.ids.includes('d')));
});

test('domain generik tidak membuat dua studio dianggap duplikat', () => {
  const groups = findPossibleDuplicates([
    { id: 'a', name: 'Studio A', domain: 'instagram.com', latitude: -7.25, longitude: 112.75 },
    { id: 'b', name: 'Studio B', domain: 'instagram.com', latitude: -7.3, longitude: 112.8 },
  ]);
  assert.equal(groups.length, 0);
});
