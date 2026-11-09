import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { exportWorkbook } from '../src/export.js';
import { AGE_STATUS } from '../src/age.js';

function samplePlace() {
  const signal = {
    type: 'wayback',
    label: 'Situs terarsip sejak 2010-01-01',
    date: '2010-01-01',
    url: 'https://web.archive.org/example',
    weight: 35,
    detail: 'Snapshot uji',
    time: Date.parse('2010-01-01'),
  };
  const age = {
    status: AGE_STATUS.VERIFIED,
    statusLabel: 'Usia terverifikasi (>= 2 tahun)',
    confidence: 35,
    cutoffMs: Date.parse('2024-01-01'),
    cutoff: new Date('2024-01-01'),
    earliest: signal,
    ageYears: 16,
    foundedYear: 2010,
    signals: [signal],
  };

  return {
    placeId: 'p1',
    name: 'Studio Uji',
    categoryName: 'Agensi desain',
    categories: ['Agensi desain'],
    address: 'Jl. Contoh No. 1',
    city: 'Surabaya',
    postalCode: '60111',
    phone: '031-123456',
    website: 'https://studio-uji.id',
    domain: 'studio-uji.id',
    rating: 4.8,
    reviewsCount: 12,
    openingHours: 'Senin: 09.00–17.00',
    latitude: -7.2,
    longitude: 112.7,
    mapsUrl: 'https://maps.google.com/?cid=1',
    emails: ['halo@studio-uji.id'],
    instagrams: ['https://instagram.com/studio-uji'],
    facebooks: [],
    linkedIns: [],
    youtubes: [],
    sources: ['studio desain'],
    relevance: { ok: true, matched: ['desain'], excluded: [] },
    closed: false,
    age,
  };
}

test('exportWorkbook menghasilkan sheet utama dan baris studio', async () => {
  const filePath = '/tmp/sdd-export-test.xlsx';
  await fs.rm(filePath, { force: true });
  const place = samplePlace();

  await exportWorkbook({
    generatedAt: new Date('2026-11-09T00:00:00Z'),
    runMeta: {
      source: 'test',
      actorId: 'test',
      runId: 'run-1',
      datasetId: 'dataset-1',
      status: 'SUCCEEDED',
      costUsd: 0,
      maxTotalChargeUsd: 10,
      keywords: ['studio desain'],
      maxPlacesPerSearch: 1,
      maxReviewsPerPlace: 0,
      reviewsSort: '-',
      contactsEnrichment: false,
      enrichmentEnabled: true,
      locationQuery: 'Surabaya',
    },
    searchStrings: ['studio desain'],
    targetCount: 1,
    minYears: 2,
    candidates: [place],
    relevant: [place],
    finalList: [place],
    rawCount: 1,
    filePath,
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ['Studio', 'Semua Kandidat', 'Bukti Usia', 'Ringkasan', 'Log'],
  );

  const studio = workbook.getWorksheet('Studio');
  assert.equal(studio.getCell('B2').value, 'Studio Uji');
  assert.equal(studio.getCell('V2').value, 'Usia terverifikasi (>= 2 tahun)');

  const summary = workbook.getWorksheet('Ringkasan');
  const metrics = new Map();
  summary.eachRow((row, index) => {
    if (index > 1) metrics.set(row.getCell(1).value, row.getCell(2).value);
  });
  assert.equal(metrics.get('Usia terverifikasi (>= 2 tahun)'), 1);
  assert.equal(metrics.get('Target terpenuhi'), 'Ya (semua terverifikasi)');

  await fs.rm(filePath, { force: true });
});
