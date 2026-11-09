import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateContent } from '../src/validate-content.js';

const content = JSON.parse(fs.readFileSync(new URL('../site/data/content.json', import.meta.url)));

test('content.json valid', () => {
  assert.deepEqual(validateContent(content), []);
});

test('konten menolak bagian privacy tanpa paragraf', () => {
  const next = structuredClone(content);
  next.privacy.sections[0].paragraphs = [];
  const errors = validateContent(next);
  assert.ok(errors.some((error) => error.includes('paragraphs')));
});

test('konten menolak koordinat peta di luar rentang', () => {
  const next = structuredClone(content);
  next.map.defaultCenter = [200, -95];
  const errors = validateContent(next);
  assert.ok(errors.some((error) => error.includes('defaultCenter[0]')));
  assert.ok(errors.some((error) => error.includes('defaultCenter[1]')));
});

test('konten memperingatkan title SEO terlalu panjang', () => {
  const next = structuredClone(content);
  next.seo.home.title = 'x'.repeat(71);
  assert.ok(validateContent(next).some((error) => error.includes('maksimal 70')));
});

test('konten menolak link navigasi tanpa href', () => {
  const next = structuredClone(content);
  next.navigation[0].href = '';
  assert.ok(validateContent(next).some((error) => error.includes('navigation[0].href')));
});
