import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from './config.js';
import { createClient, runActor, buildActorInput, fetchDatasetItems } from './apify.js';
import { normalizePlace, mergePlace } from './normalize.js';
import { relevanceOf } from './relevance.js';
import { enrichPlace } from './enrich.js';
import { classifyAge, cutoffDate, AGE_STATUS, AGE_ORDER } from './age.js';
import { loadCache, saveCache } from './cache.js';
import { exportWorkbook } from './export.js';
import { log, mapLimit, parseArgs } from './utils.js';

const args = parseArgs(process.argv.slice(2));
const generatedAt = new Date();
const cutoff = cutoffDate(generatedAt);
const targetCount = Number(args.limit ?? config.targetCount);
const enrichmentEnabled =
  config.enrichment.enabled && args['no-enrich'] !== true && args['no-age'] !== true;

function resolveKeywords() {
  if (typeof args.keywords === 'string') {
    return args.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }
  return config.searchStrings;
}

function dedupePlaces(rawItems) {
  const byKey = new Map();
  for (const item of rawItems) {
    const place = normalizePlace(item);
    if (!place.name) continue;
    const key = place.placeId || `${place.name.toLowerCase()}|${place.address.toLowerCase()}`;
    byKey.set(key, byKey.has(key) ? mergePlace(byKey.get(key), place) : place);
  }
  return [...byKey.values()];
}

async function saveRaw(items) {
  const dir = path.resolve(config.outputDir);
  await fs.mkdir(dir, { recursive: true });
  const stamp = generatedAt.toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `raw-${stamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  log(`Data mentah disimpan ke ${filePath} (bisa dipakai ulang dengan --input).`);
  return filePath;
}

async function loadRaw(files) {
  const rawItems = [];
  for (const file of files) {
    const items = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
    log(`  ${file}: ${items.length} item`);
    rawItems.push(...items);
  }
  return rawItems;
}

async function collect({ searchStrings, maxPlacesPerSearch }) {
  if (typeof args.input === 'string') {
    const files = args.input
      .split(',')
      .map((file) => file.trim())
      .filter(Boolean);
    const rawItems = await loadRaw(files);
    log(`Memuat ${rawItems.length} item dari ${files.length} file (mode offline, Apify tidak dipanggil).`);
    return {
      rawItems,
      runMeta: {
        source: files.map((file) => `file:${file}`).join(' + '),
        actorId: '-',
        runId: '-',
        datasetId: '-',
        keywords: searchStrings,
        maxPlacesPerSearch,
        maxReviewsPerPlace: config.maxReviewsPerPlace,
        contactsEnrichment: config.contactsEnrichment,
        enrichmentEnabled,
      },
    };
  }

  const client = createClient(process.env.APIFY_TOKEN);
  const input = buildActorInput({ searchStrings, maxPlacesPerSearch });
  log(
    `Menjalankan actor ${config.actorId}: ${searchStrings.length} keyword, maksimal ${maxPlacesPerSearch} place per keyword, lokasi "${config.locationQuery}", batas biaya $${config.maxTotalChargeUsd}.`,
  );

  const run = await runActor(client, config.actorId, input, {
    timeoutSecs: config.runTimeoutSecs,
    maxTotalChargeUsd: config.maxTotalChargeUsd,
    onPoll: (current) => log(`  run ${current.id}: ${current.status}`),
  });

  if (run.status !== 'SUCCEEDED') {
    log(
      `Peringatan: run berakhir dengan status ${run.status} (${run.statusMessage ?? '-'}). Melanjutkan dengan data yang sudah terkumpul.`,
    );
  }

  const costUsd = Number(run.usageTotalUsd ?? 0);
  log(`Biaya run: $${costUsd.toFixed(4)} dari batas $${config.maxTotalChargeUsd}.`);

  const { items } = await fetchDatasetItems(client, run.defaultDatasetId, {
    maxItems: config.candidateTarget * 3,
    onProgress: (count, total) => log(`  dataset: ${count}${total ? `/${total}` : ''} item`),
  });

  if (items.length === 0) {
    throw new Error('Run tidak menghasilkan data. Cek dashboard Apify untuk detail kegagalan.');
  }

  return {
    rawItems: items,
    runMeta: {
      source: 'apify',
      actorId: config.actorId,
      runId: run.id,
      datasetId: run.defaultDatasetId,
      status: run.status,
      costUsd,
      maxTotalChargeUsd: config.maxTotalChargeUsd,
      keywords: searchStrings,
      maxPlacesPerSearch,
      maxReviewsPerPlace: config.maxReviewsPerPlace,
      contactsEnrichment: config.contactsEnrichment,
      enrichmentEnabled,
    },
  };
}

function selectFinal(places) {
  return places
    .filter((place) => place.age.status !== AGE_STATUS.YOUNG)
    .sort((a, b) => {
      const rank = AGE_ORDER.indexOf(a.age.status) - AGE_ORDER.indexOf(b.age.status);
      if (rank !== 0) return rank;
      if (b.age.confidence !== a.age.confidence) return b.age.confidence - a.age.confidence;
      return b.reviewsCount - a.reviewsCount;
    })
    .slice(0, targetCount);
}

function report(finalList, relevant) {
  const counts = AGE_ORDER.reduce((accumulator, status) => {
    accumulator[status] = relevant.filter((place) => place.age.status === status).length;
    return accumulator;
  }, {});

  log('--- Ringkasan ---');
  log(`Usia terverifikasi (>= ${config.minYearsOperating} tahun): ${counts[AGE_STATUS.VERIFIED] ?? 0}`);
  log(`Perlu cek manual: ${counts[AGE_STATUS.MANUAL] ?? 0}`);
  log(`Tidak dapat dipastikan: ${counts[AGE_STATUS.UNKNOWN] ?? 0}`);
  log(`Kemungkinan < ${config.minYearsOperating} tahun (dibuang): ${counts[AGE_STATUS.YOUNG] ?? 0}`);
  log(`Masuk sheet Studio: ${finalList.length}/${targetCount}`);

  if (finalList.length < targetCount) {
    log(
      `Target belum terpenuhi. Tambah keyword / naikkan --max-per-search, atau turunkan standar dengan memakai sheet "Semua Kandidat".`,
    );
  }
}

async function main() {
  log(
    `Mulai. Target ${targetCount} studio desain/branding di ${config.locationQuery}, minimal ${config.minYearsOperating} tahun (batas: ${cutoff
          .toISOString()
          .slice(0, 10)}).`,
  );

  const searchStrings = resolveKeywords();
  const maxPlacesPerSearch = Number(args['max-per-search'] ?? config.maxPlacesPerSearch);

  const { rawItems, runMeta } = await collect({ searchStrings, maxPlacesPerSearch });
  log(`Hasil mentah: ${rawItems.length} place.`);
  if (!args.input) await saveRaw(rawItems);

  const candidates = dedupePlaces(rawItems);
  log(`Unik setelah dedupe: ${candidates.length} kandidat.`);

  for (const candidate of candidates) {
    candidate.relevance = relevanceOf(candidate);
  }

  const relevant = candidates.filter((candidate) => candidate.relevance.ok && !candidate.closed);
  log(`Lolos filter relevansi & belum tutup: ${relevant.length}.`);

  if (enrichmentEnabled) {
    const cachePath = path.resolve(config.outputDir, config.enrichment.cacheFile);
    const cache = await loadCache(cachePath);
    const cachedEntries = Object.keys(cache).length;
    log(
      `Mengumpulkan bukti usia (concurrency ${config.enrichment.concurrency}, cache ${cachedEntries} entri)...`,
    );

    let done = 0;
    await mapLimit(relevant, config.enrichment.concurrency, async (place) => {
      const result = await enrichPlace(place, cache);
      Object.assign(place, result);
      done += 1;
      if (done % 25 === 0) log(`  ${done}/${relevant.length} tempat diperiksa.`);
    });

    await saveCache(cachePath, cache);
    const added = Object.keys(cache).length - cachedEntries;
    log(`Enrichment selesai: ${done}/${relevant.length} tempat (${added} entri baru di cache).`);
  }

  for (const place of relevant) {
    place.age = classifyAge(place.ageSignals ?? [], generatedAt);
  }

  const finalList = selectFinal(relevant);

  const filePath = await exportWorkbook({
    generatedAt,
    runMeta: { ...runMeta, locationQuery: config.locationQuery },
    searchStrings,
    targetCount,
    minYears: config.minYearsOperating,
    candidates,
    relevant,
    finalList,
    rawCount: rawItems.length,
    filePath: path.resolve(config.outputDir, config.outputFile),
  });

  report(finalList, relevant);
  log(`Selesai. File Excel: ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
