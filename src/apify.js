import { ApifyClient } from 'apify-client';
import { config } from './config.js';

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);

export function createClient(token) {
  if (!token) {
    throw new Error(
      'APIFY_TOKEN belum diisi. Salin .env.example menjadi .env lalu isi token Apify kamu.',
    );
  }
  return new ApifyClient({ token });
}

export function buildActorInput({ searchStrings, maxPlacesPerSearch }) {
  const input = {
    searchStringsArray: searchStrings,
    locationQuery: config.locationQuery,
    maxCrawledPlacesPerSearch: maxPlacesPerSearch,
    language: config.language,
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
    website: 'allPlaces',
    scrapeContacts: config.contactsEnrichment,
  };

  if (config.maxReviewsPerPlace > 0) {
    input.maxReviews = config.maxReviewsPerPlace;
    input.reviewsSort = 'newest';
    input.reviewsOrigin = 'google';
    input.scrapeReviewsPersonalData = false;
  }

  return input;
}

export async function runActor(client, actorId, input, options = {}) {
  const { timeoutSecs = 5400, pollSecs = 120, maxTotalChargeUsd, onPoll } = options;
  let run = await client.actor(actorId).start(input, { maxTotalChargeUsd });
  const deadline = Date.now() + timeoutSecs * 1000;

  while (!TERMINAL_STATUSES.has(run.status)) {
    if (Date.now() > deadline) {
      throw new Error(`Run ${run.id} melewati batas ${timeoutSecs}s (status: ${run.status}).`);
    }
    run = await client.run(run.id).waitForFinish({ waitSecs: pollSecs });
    onPoll?.(run);
  }

  return run;
}

export async function fetchDatasetItems(client, datasetId, options = {}) {
  const { maxItems = 10000, batch = 1000, onProgress } = options;
  const items = [];
  let offset = 0;

  for (;;) {
    const response = await client.dataset(datasetId).listItems({ offset, limit: batch, clean: true });
    const page = response.items ?? [];
    items.push(...page);
    onProgress?.(items.length, response.total);

    if (page.length < batch) break;
    offset += page.length;
    if (items.length >= maxItems) break;
    if (typeof response.total === 'number' && items.length >= response.total) break;
  }

  return { items, total: items.length };
}
