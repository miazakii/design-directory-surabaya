import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeStrings, mapLimit, parseArgs, yearsBetween } from '../src/utils.js';

test('parseArgs mendukung flag boolean dan nilai', () => {
  assert.deepEqual(parseArgs(['--limit', '10', '--no-enrich', '--keywords', 'a,b']), {
    limit: '10',
    'no-enrich': true,
    keywords: 'a,b',
  });
});

test('dedupeStrings membuang nilai kosong dan duplikat', () => {
  assert.deepEqual(dedupeStrings(['a', ' a ', '', null, 'b', 'a']), ['a', 'b']);
});

test('yearsBetween memakai pembulatan satu desimal', () => {
  const from = Date.parse('2020-01-01T00:00:00Z');
  const to = new Date('2024-01-01T00:00:00Z');
  assert.equal(yearsBetween(from, to), 4);
});

test('mapLimit mempertahankan urutan dan menangkap error per item', async () => {
  const results = await mapLimit([1, 2, 3, 4], 2, async (value) => {
    if (value === 3) throw new Error('boom');
    return value * 2;
  });
  assert.deepEqual(results, [2, 4, { error: 'boom' }, 8]);
});
