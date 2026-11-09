import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActorInput } from '../src/apify.js';

test('input actor memakai maxReviews dari parameter, bukan hanya config', () => {
  const input = buildActorInput({
    searchStrings: ['studio desain'],
    maxPlacesPerSearch: 10,
    maxReviewsPerPlace: 5,
  });
  assert.equal(input.maxReviews, 5);
  assert.equal(input.reviewsSort, 'newest');
  assert.equal(input.scrapeReviewsPersonalData, false);
});

test('maxReviews 0 tidak menambahkan opsi review', () => {
  const input = buildActorInput({
    searchStrings: ['studio desain'],
    maxPlacesPerSearch: 10,
    maxReviewsPerPlace: 0,
  });
  assert.equal('maxReviews' in input, false);
  assert.equal('reviewsSort' in input, false);
});
