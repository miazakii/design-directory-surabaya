import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadCache, saveCache } from '../src/cache.js';
import { enrichPlace } from '../src/enrich.js';

test('cache disimpan secara atomik dan bisa dibaca kembali', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-cache-'));
  const file = path.join(dir, 'cache.json');
  const cache = { p1: { fetchedAt: Date.now(), data: { ageSignals: [] }, partial: false } };

  await saveCache(file, cache);
  assert.deepEqual(await loadCache(file), cache);

  cache.p2 = { fetchedAt: Date.now(), data: { ageSignals: [] }, partial: true };
  await saveCache(file, cache);
  assert.deepEqual(await loadCache(file), cache);

  const files = await fs.readdir(dir);
  assert.deepEqual(files, ['cache.json']);
  await fs.rm(dir, { recursive: true, force: true });
});

test('cache yang masih segar dipakai tanpa request jaringan', async () => {
  const key = 'place-test';
  const data = { ageSignals: [], emails: ['halo@studio.id'] };
  const cache = { [key]: { fetchedAt: Date.now(), data, partial: false } };
  const place = { placeId: key, name: 'Studio', domain: 'studio.id', emails: [] };

  const result = await enrichPlace(place, cache);
  assert.deepEqual(result, data);
});
