import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupePlaces } from '../src/dedupe.js';

const raw = (overrides) => ({
  placeId: '',
  title: 'Studio A',
  categoryName: 'Agensi desain',
  address: 'Jl. Contoh',
  phone: '',
  website: '',
  location: { lat: -7.25, lng: 112.75 },
  reviewsCount: 0,
  ...overrides,
});

test('placeId yang sama digabung', () => {
  const result = dedupePlaces([
    raw({ placeId: 'p1', title: 'Studio A', phone: '031-111' }),
    raw({ placeId: 'p1', title: 'Studio A', website: 'https://studio-a.id' }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].phone, '031-111');
  assert.equal(result[0].website, 'https://studio-a.id');
});

test('telepon yang sama digabung meskipun placeId berbeda', () => {
  const result = dedupePlaces([
    raw({ placeId: 'p1', title: 'Studio Alpha', phone: '+62 31 111 222' }),
    raw({ placeId: 'p2', title: 'Studio Alpha 2', phone: '+62 31 111 222' }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sources, []);
});

test('koordinat dekat + nama mirip digabung', () => {
  const result = dedupePlaces([
    raw({ placeId: 'p1', title: 'Studio Desain A', location: { lat: -7.25, lng: 112.75 } }),
    raw({ placeId: 'p2', title: 'Studio Desain A', location: { lat: -7.2501, lng: 112.7501 } }),
  ]);
  assert.equal(result.length, 1);
});

test('domain sama tanpa sinyal kuat tetap dipisah', () => {
  const result = dedupePlaces([
    raw({
      placeId: 'p1',
      title: 'VisualCast',
      website: 'https://visual-cast.com',
      location: { lat: -7.2822675, lng: 112.6988834 },
    }),
    raw({
      placeId: 'p2',
      title: 'VisualCast Design',
      website: 'https://visual-cast.com',
      location: { lat: -7.2756721, lng: 112.6962121 },
    }),
  ]);
  assert.equal(result.length, 2);
});

test('sumber keyword digabung saat duplikat', () => {
  const result = dedupePlaces([
    raw({ placeId: 'p1', searchString: 'studio desain' }),
    raw({ placeId: 'p1', searchString: 'branding agency' }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sources, ['studio desain', 'branding agency']);
});
