import test from 'node:test';
import assert from 'node:assert/strict';
import { relevanceOf } from '../src/relevance.js';

const place = (overrides) => ({
  name: 'Studio Contoh',
  categoryName: 'Agensi desain',
  categories: [],
  ...overrides,
});

test('nama kuat mengalahkan kategori Google yang mismatch', () => {
  const result = relevanceOf(
    place({
      name: 'Studio Branding Contoh',
      categoryName: 'Konsultan Pemasaran',
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'Nama cocok kuat');
  assert.deepEqual(result.excluded, []);
});

test('istilah mismatch di nama tetap menang meskipun ada strong term', () => {
  const result = relevanceOf(
    place({
      name: 'Studio Desain Interior Contoh',
      categoryName: 'Agensi desain',
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Nama mengandung istilah yang dikecualikan');
  assert.deepEqual(result.excluded, ['interior']);
});

test('kategori utama yang mismatch menolak kandidat tanpa strong name', () => {
  const result = relevanceOf(
    place({
      name: 'Studio Contoh',
      categoryName: 'Konsultan Pemasaran',
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Kategori utama dikecualikan');
});

test('kategori sekunder dipakai untuk mencocokkan kata inti', () => {
  const result = relevanceOf(
    place({
      name: 'Studio Contoh',
      categoryName: 'Kantor Perusahaan',
      categories: ['Agensi desain'],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'Kata inti cocok');
});

test('kandidat tanpa kata kunci relevan ditolak', () => {
  const result = relevanceOf(
    place({
      name: 'Toko Bangunan Contoh',
      categoryName: 'Toko',
      categories: [],
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Nama mengandung istilah yang dikecualikan');
});

test('kategori dan nama kosong tidak melempar error', () => {
  const result = relevanceOf({ name: '', categoryName: '', categories: [] });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Tidak ada kata kunci relevan');
});
