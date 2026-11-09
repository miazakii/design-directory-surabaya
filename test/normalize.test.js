import test from 'node:test';
import assert from 'node:assert/strict';
import {
  domainOf,
  mergePlace,
  normalizePlace,
  sanitizeEmails,
  sanitizeSocials,
  toStringList,
} from '../src/normalize.js';

test('domainOf menormalkan URL dan menghapus www', () => {
  assert.equal(domainOf('https://www.Contoh.co.id/path'), 'contoh.co.id');
  assert.equal(domainOf('contoh.id'), 'contoh.id');
  assert.equal(domainOf(''), '');
});

test('sanitizeEmails membuang noise dan duplikat', () => {
  assert.deepEqual(
    sanitizeEmails(['Halo@Contoh.id.', 'halo@contoh.id', 'sentry@example.com', 'logo.png']),
    ['halo@contoh.id'],
  );
});

test('sanitizeSocials membuang URL noise', () => {
  assert.deepEqual(
    sanitizeSocials(['https://instagram.com/studio', 'https://example.com/logo.png']),
    ['https://instagram.com/studio'],
  );
});

test('toStringList mendukung string, array, dan objek', () => {
  assert.deepEqual(
    toStringList('a', ['b', { value: 'c' }], { email: 'd' }, 'a'),
    ['a', 'b', 'c', 'd'],
  );
});

test('normalizePlace memetakan kontak dan lokasi', () => {
  const place = normalizePlace({
    placeId: 'p1',
    title: 'Studio A',
    categoryName: 'Agensi desain',
    address: 'Jl. Contoh',
    website: 'https://www.studio-a.id',
    location: { lat: -7.2, lng: 112.7 },
    reviews: [{ publishedAtDate: '2020-01-02' }, { publishedAtDate: '2019-05-01' }],
    contacts: { emails: ['halo@studio-a.id'] },
    searchString: 'studio desain',
  });

  assert.equal(place.domain, 'studio-a.id');
  assert.equal(place.latitude, -7.2);
  assert.equal(place.longitude, 112.7);
  assert.deepEqual(place.emails, ['halo@studio-a.id']);
  assert.deepEqual(place.reviewDates, ['2019-05-01', '2020-01-02']);
  assert.deepEqual(place.sources, ['studio desain']);
});

test('mergePlace menggabungkan kontak dan memilih nilai yang tersedia', () => {
  const a = normalizePlace({
    placeId: 'p1',
    title: 'Studio A',
    address: '',
    emails: ['a@studio-a.id'],
    searchString: 'keyword a',
  });
  const b = normalizePlace({
    placeId: 'p1',
    title: 'Studio A',
    address: 'Jl. Contoh',
    emails: ['b@studio-a.id'],
    searchString: 'keyword b',
  });
  const merged = mergePlace(a, b);

  assert.equal(merged.address, 'Jl. Contoh');
  assert.deepEqual(merged.emails, ['a@studio-a.id', 'b@studio-a.id']);
  assert.deepEqual(merged.sources, ['keyword a', 'keyword b']);
});
