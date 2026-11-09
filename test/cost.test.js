import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRunCost } from '../src/cost.js';

test('estimasi biaya menghitung komponen utama', () => {
  const estimate = estimateRunCost({
    keywords: 12,
    maxPlacesPerSearch: 40,
    maxReviewsPerPlace: 50,
    contactsEnrichment: true,
  });

  assert.equal(estimate.places, 480);
  assert.equal(estimate.base, 2.4);
  assert.equal(estimate.details, 0.96);
  assert.equal(Number(estimate.contacts.toFixed(3)), 0.288);
  assert.equal(estimate.reviews, 12);
  assert.equal(Number(estimate.total.toFixed(3)), 15.648);
});

test('estimasi tanpa review tidak menambahkan biaya detail/review', () => {
  const estimate = estimateRunCost({
    keywords: 2,
    maxPlacesPerSearch: 30,
    maxReviewsPerPlace: 0,
    contactsEnrichment: false,
  });

  assert.equal(estimate.places, 60);
  assert.equal(estimate.details, 0);
  assert.equal(estimate.contacts, 0);
  assert.equal(estimate.reviews, 0);
  assert.equal(Number(estimate.total.toFixed(3)), 0.3);
});

test('input kosong menghasilkan estimasi nol', () => {
  const estimate = estimateRunCost({ keywords: 0, maxPlacesPerSearch: 0 });
  assert.equal(estimate.places, 0);
  assert.equal(estimate.total, 0);
  assert.equal(estimate.perPlace, 0);
});
