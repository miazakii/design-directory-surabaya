import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from './config.js';
import { createClient, runActor, buildActorInput, fetchDatasetItems } from './apify.js';
import { dedupePlaces } from './dedupe.js';
import { findPossibleDuplicates } from './data-quality.js';
import { estimateRunCost } from './cost.js';
import { relevanceOf } from './relevance.js';
import { enrichPlace } from './enrich.js';
import { classifyAge, cutoffDate, ageStatusLabel, AGE_STATUS, AGE_ORDER } from './age.js';
import { loadCache, saveCache } from './cache.js';
import { exportWorkbook } from './export.js';
import { log, mapLimit, parseArgs, setLogFile } from './utils.js';

const args = parseArgs(process.argv.slice(2));
const generatedAt = new Date();
const runStamp = generatedAt.toISOString().replace(/[:.]/g, '-');
const cutoff = cutoffDate(generatedAt);

function positiveInt(value, label, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} harus bilangan bulat positif.`);
  }
  return parsed;
}

function nonNegativeInt(value, label, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} harus bilangan bulat >= 0.`);
  }
  return parsed;
}

const targetCount = positiveInt(args.limit, '--limit', config.targetCount);
const maxPlacesPerSearch = positiveInt(
  args['max-per-search'],
  '--max-per-search',
  config.maxPlacesPerSearch,
);
const maxReviewsPerPlace = nonNegativeInt(
  args['max-reviews'],
  '--max-reviews',
  config.maxReviewsPerPlace,
);
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

async function saveRaw(items) {
  const dir = path.resolve(config.outputDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `raw-${runStamp}.json`);
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
        maxReviewsPerPlace,
        reviewsSort: maxReviewsPerPlace > 0 ? 'newest' : '-',
        contactsEnrichment: config.contactsEnrichment,
        enrichmentEnabled,
      },
    };
  }

  const client = createClient(process.env.APIFY_TOKEN);
  const input = buildActorInput({ searchStrings, maxPlacesPerSearch, maxReviewsPerPlace });
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
      maxReviewsPerPlace,
      reviewsSort: maxReviewsPerPlace > 0 ? 'newest' : '-',
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
  log(`${ageStatusLabel(AGE_STATUS.VERIFIED)}: ${counts[AGE_STATUS.VERIFIED] ?? 0}`);
  log(`${ageStatusLabel(AGE_STATUS.MANUAL)}: ${counts[AGE_STATUS.MANUAL] ?? 0}`);
  log(`${ageStatusLabel(AGE_STATUS.UNKNOWN)}: ${counts[AGE_STATUS.UNKNOWN] ?? 0}`);
  log(`${ageStatusLabel(AGE_STATUS.YOUNG)} (dibuang): ${counts[AGE_STATUS.YOUNG] ?? 0}`);
  log(`Masuk sheet Studio: ${finalList.length}/${targetCount}`);

  if (finalList.length < targetCount) {
    log(
      `Target belum terpenuhi. Tambah keyword / naikkan --max-per-search, atau turunkan standar dengan memakai sheet "Semua Kandidat".`,
    );
  }
}

async function main() {
  await setLogFile(path.resolve(config.outputDir, `run-${runStamp}.log`));
  log(
    `Mulai. Target ${targetCount} studio desain/branding di ${config.locationQuery}, minimal ${config.minYearsOperating} tahun (batas: ${cutoff
          .toISOString()
          .slice(0, 10)}).`,
  );
  log(`Log run: ${path.resolve(config.outputDir, `run-${runStamp}.log`)}`);

  const searchStrings = resolveKeywords();
  if (searchStrings.length === 0) {
    throw new Error('Daftar keyword kosong. Isi --keywords atau config.searchStrings.');
  }

  if (args['dry-run'] === true) {
    const estimate = estimateRunCost({
      keywords: searchStrings.length,
      maxPlacesPerSearch,
      maxReviewsPerPlace,
      contactsEnrichment: config.contactsEnrichment,
    });
    log('--- Estimasi biaya (dry run, Apify tidak dipanggil) ---');
    log(`Place maksimum: ${estimate.places}`);
    log(
      `Perkiraan total: $${estimate.total.toFixed(4)} ($${estimate.perPlace.toFixed(4)}/place)`,
    );
    log(
      `Rincian: base $${estimate.base.toFixed(4)}, detail $${estimate.details.toFixed(4)}, kontak $${estimate.contacts.toFixed(4)}, review $${estimate.reviews.toFixed(4)}`,
    );
    log(`Batas biaya run: $${config.maxTotalChargeUsd}`);
    return;
  }

  const { rawItems, runMeta } = await collect({ searchStrings, maxPlacesPerSearch });
  log(`Hasil mentah: ${rawItems.length} place.`);
  if (!args.input) await saveRaw(rawItems);

  const candidates = dedupePlaces(rawItems);
  log(`Unik setelah dedupe: ${candidates.length} kandidat.`);
  const possibleDuplicates = findPossibleDuplicates(candidates);
  if (possibleDuplicates.length > 0) {
    log(
      `Kemungkinan duplikat tersisa: ${possibleDuplicates.length} kelompok (periksa sheet "Semua Kandidat" / npm run check:data).`,
    );
  }

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
    runMeta: {
      ...runMeta,
      locationQuery: config.locationQuery,
      logFile: path.resolve(config.outputDir, `run-${runStamp}.log`),
    },
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
