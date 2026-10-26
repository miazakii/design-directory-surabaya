import path from 'node:path';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { AGE_STATUS, AGE_ORDER } from './age.js';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const ALT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FA' } };

const STUDIO_COLUMNS = [
  { header: 'No', key: 'no', width: 5 },
  { header: 'Nama Studio', key: 'name', width: 34 },
  { header: 'Kategori Utama', key: 'categoryName', width: 22 },
  { header: 'Kategori Lainnya', key: 'categories', width: 30 },
  { header: 'Alamat', key: 'address', width: 42 },
  { header: 'Kota', key: 'city', width: 12 },
  { header: 'Kode Pos', key: 'postalCode', width: 9 },
  { header: 'Telepon', key: 'phone', width: 18 },
  { header: 'Website', key: 'website', width: 34 },
  { header: 'Email', key: 'emails', width: 30 },
  { header: 'Instagram', key: 'instagram', width: 32 },
  { header: 'Facebook', key: 'facebook', width: 32 },
  { header: 'LinkedIn', key: 'linkedin', width: 32 },
  { header: 'YouTube', key: 'youtube', width: 30 },
  { header: 'Rating', key: 'rating', width: 8 },
  { header: 'Jumlah Review', key: 'reviewsCount', width: 13 },
  { header: 'Jam Buka', key: 'openingHours', width: 40 },
  { header: 'Latitude', key: 'latitude', width: 11 },
  { header: 'Longitude', key: 'longitude', width: 11 },
  { header: 'Google Maps', key: 'mapsUrl', width: 30 },
  { header: 'Place ID', key: 'placeId', width: 27 },
  { header: 'Status Usia', key: 'ageStatus', width: 26 },
  { header: 'Skor Keyakinan', key: 'confidence', width: 14 },
  { header: 'Estimasi Tahun Berdiri', key: 'foundedYear', width: 18 },
  { header: 'Usia (tahun)', key: 'ageYears', width: 12 },
  { header: 'Sinyal Usia', key: 'ageSummary', width: 46 },
  { header: 'Bukti Utama', key: 'evidenceUrl', width: 34 },
  { header: 'Ditemukan via Keyword', key: 'sources', width: 26 },
];

const CANDIDATE_COLUMNS = [
  { header: 'No', key: 'no', width: 5 },
  { header: 'Nama', key: 'name', width: 34 },
  { header: 'Kategori Utama', key: 'categoryName', width: 22 },
  { header: 'Alamat', key: 'address', width: 42 },
  { header: 'Telepon', key: 'phone', width: 18 },
  { header: 'Website', key: 'website', width: 34 },
  { header: 'Email', key: 'emails', width: 30 },
  { header: 'Rating', key: 'rating', width: 8 },
  { header: 'Jumlah Review', key: 'reviewsCount', width: 13 },
  { header: 'Lolos Filter Relevansi', key: 'relevant', width: 18 },
  { header: 'Istilah Cocok', key: 'matched', width: 26 },
  { header: 'Istilah Dikecualikan', key: 'excluded', width: 26 },
  { header: 'Masuk Daftar Utama', key: 'selected', width: 17 },
  { header: 'Status Usia', key: 'ageStatus', width: 26 },
  { header: 'Skor Keyakinan', key: 'confidence', width: 14 },
  { header: 'Sinyal Usia', key: 'ageSummary', width: 46 },
  { header: 'Tutup', key: 'closed', width: 8 },
  { header: 'Google Maps', key: 'mapsUrl', width: 30 },
];

const EVIDENCE_COLUMNS = [
  { header: 'No', key: 'no', width: 5 },
  { header: 'Nama Studio', key: 'name', width: 34 },
  { header: 'Tipe Sinyal', key: 'type', width: 12 },
  { header: 'Keterangan', key: 'label', width: 38 },
  { header: 'Tanggal', key: 'date', width: 13 },
  { header: 'Detail', key: 'detail', width: 56 },
  { header: 'Bobot', key: 'weight', width: 8 },
  { header: 'Dihitung ke Skor', key: 'counted', width: 15 },
  { header: 'Link Bukti', key: 'url', width: 44 },
];

const LOG_COLUMNS = [
  { header: 'Metrik', key: 'metric', width: 32 },
  { header: 'Nilai', key: 'value', width: 70 },
];

const SUMMARY_COLUMNS = [
  { header: 'Metrik', key: 'metric', width: 34 },
  { header: 'Nilai', key: 'value', width: 26 },
];

function link(url) {
  return url ? { text: url, hyperlink: url } : '';
}

function first(list) {
  return list?.[0] ?? '';
}

function joined(list) {
  return (list ?? []).join('; ');
}

function ageSummary(signals) {
  return (signals ?? []).map((signal) => `${signal.label} [${signal.weight}]`).join(' | ');
}

function styleSheet(sheet, columns) {
  sheet.columns = columns;
  const header = sheet.getRow(1);
  header.font = HEADER_FONT;
  header.fill = HEADER_FILL;
  header.height = 24;
  header.alignment = { vertical: 'middle', wrapText: true };

  for (const column of columns) {
    sheet.getColumn(column.key).alignment = { vertical: 'top', wrapText: true };
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.properties.defaultRowHeight = 16;
}

function targetStatus(rowCount, verifiedCount, target) {
  if (rowCount < target) return 'Tidak';
  return verifiedCount >= target
    ? 'Ya (semua terverifikasi)'
    : 'Sebagian (ada baris belum terverifikasi)';
}

function stripeRows(sheet, rowCount, columnCount) {
  for (let row = 2; row <= rowCount + 1; row += 1) {
    if (row % 2 !== 0) continue;
    for (let column = 1; column <= columnCount; column += 1) {
      sheet.getCell(row, column).fill = ALT_FILL;
    }
  }
}

function studioRow(place, index) {
  return {
    no: index + 1,
    name: place.name,
    categoryName: place.categoryName,
    categories: joined(place.categories),
    address: place.address,
    city: place.city,
    postalCode: place.postalCode,
    phone: place.phone,
    website: link(place.website),
    emails: joined(place.emails),
    instagram: first(place.instagrams),
    facebook: first(place.facebooks),
    linkedin: first(place.linkedIns),
    youtube: first(place.youtubes),
    rating: place.rating ?? '',
    reviewsCount: place.reviewsCount,
    openingHours: place.openingHours,
    latitude: place.latitude ?? '',
    longitude: place.longitude ?? '',
    mapsUrl: link(place.mapsUrl),
    placeId: place.placeId,
    ageStatus: place.age.status,
    confidence: place.age.confidence,
    foundedYear: place.age.foundedYear ?? '',
    ageYears: place.age.ageYears ?? '',
    ageSummary: ageSummary(place.age.signals),
    evidenceUrl: link(place.age.earliest?.url),
    sources: joined(place.sources),
  };
}

function candidateRow(place, index, selectedIds) {
  return {
    no: index + 1,
    name: place.name,
    categoryName: place.categoryName,
    address: place.address,
    phone: place.phone,
    website: link(place.website),
    emails: joined(place.emails),
    rating: place.rating ?? '',
    reviewsCount: place.reviewsCount,
    relevant: place.relevance?.ok ? 'Ya' : 'Tidak',
    matched: joined(place.relevance?.matched),
    excluded: joined(place.relevance?.excluded),
    selected: selectedIds.has(place.placeId || `${place.name}|${place.address}`) ? 'Ya' : 'Tidak',
    ageStatus: place.age?.status ?? '',
    confidence: place.age?.confidence ?? '',
    ageSummary: ageSummary(place.age?.signals),
    closed: place.closed ? 'Ya' : 'Tidak',
    mapsUrl: link(place.mapsUrl),
  };
}

function evidenceRows(places) {
  const rows = [];
  for (const place of places) {
    for (const signal of place.age?.signals ?? []) {
      rows.push({
        name: place.name,
        type: signal.type,
        label: signal.label,
        date: signal.date,
        detail: signal.detail ?? '',
        weight: signal.weight ?? 0,
        counted: signal.time <= (place.age?.cutoffMs ?? 0) ? 'Ya' : 'Tidak',
        url: link(signal.url),
      });
    }
  }
  return rows.map((row, index) => ({ no: index + 1, ...row }));
}

export async function exportWorkbook(context) {
  const {
    generatedAt,
    runMeta,
    searchStrings,
    targetCount,
    minYears,
    candidates,
    relevant,
    finalList,
    rawCount,
    filePath,
  } = context;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'studio-desain-surabaya';
  workbook.created = generatedAt;

  const selectedIds = new Set(
    finalList.map((place) => place.placeId || `${place.name}|${place.address}`),
  );

  const studioSheet = workbook.addWorksheet('Studio', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  styleSheet(studioSheet, STUDIO_COLUMNS);
  finalList.forEach((place, index) => studioSheet.addRow(studioRow(place, index)));
  stripeRows(studioSheet, finalList.length, STUDIO_COLUMNS.length);

  const candidateSheet = workbook.addWorksheet('Semua Kandidat');
  styleSheet(candidateSheet, CANDIDATE_COLUMNS);
  candidates.forEach((place, index) =>
    candidateSheet.addRow(candidateRow(place, index, selectedIds)),
  );
  stripeRows(candidateSheet, candidates.length, CANDIDATE_COLUMNS.length);

  const evidenceSheet = workbook.addWorksheet('Bukti Usia');
  styleSheet(evidenceSheet, EVIDENCE_COLUMNS);
  const evidences = evidenceRows(candidates);
  evidenceSheet.addRows(evidences);
  stripeRows(evidenceSheet, evidences.length, EVIDENCE_COLUMNS.length);

  const counts = AGE_ORDER.reduce((accumulator, status) => {
    accumulator[status] = candidates.filter((place) => place.age?.status === status).length;
    return accumulator;
  }, {});

  const verifiedInFinal = finalList.filter(
    (place) => place.age?.status === AGE_STATUS.VERIFIED,
  ).length;

  const summarySheet = workbook.addWorksheet('Ringkasan');
  styleSheet(summarySheet, SUMMARY_COLUMNS);
  const summaryRows = [
    { metric: 'Tanggal dibuat', value: generatedAt.toISOString().slice(0, 19).replace('T', ' ') },
    { metric: 'Sumber data', value: runMeta.source },
    { metric: 'Actor Apify', value: runMeta.actorId },
    { metric: 'Apify Run ID', value: runMeta.runId },
    { metric: 'Status run', value: runMeta.status ?? '-' },
    { metric: 'Biaya run (USD)', value: runMeta.costUsd ?? '-' },
    { metric: 'Batas biaya (USD)', value: runMeta.maxTotalChargeUsd ?? '-' },
    { metric: 'Apify Dataset ID', value: runMeta.datasetId },
    { metric: 'Lokasi pencarian', value: runMeta.locationQuery ?? '' },
    { metric: 'Jumlah keyword', value: searchStrings.length },
    { metric: 'Hasil mentah dari Google Maps', value: rawCount },
    { metric: 'Unik setelah dedupe', value: candidates.length },
    { metric: 'Lolos filter relevansi & belum tutup', value: relevant.length },
    { metric: 'Target studio', value: targetCount },
    { metric: 'Batas usia minimum (tahun)', value: minYears },
    { metric: `Usia terverifikasi (>= ${minYears} tahun)`, value: counts[AGE_STATUS.VERIFIED] ?? 0 },
    { metric: 'Perlu cek manual', value: counts[AGE_STATUS.MANUAL] ?? 0 },
    { metric: 'Tidak dapat dipastikan', value: counts[AGE_STATUS.UNKNOWN] ?? 0 },
    { metric: `Kemungkinan < ${minYears} tahun (dibuang)`, value: counts[AGE_STATUS.YOUNG] ?? 0 },
    { metric: 'Jumlah baris di sheet Studio', value: finalList.length },
    { metric: `Baris terverifikasi usia (>= ${minYears} tahun)`, value: verifiedInFinal },
    {
      metric: 'Baris belum memenuhi syarat usia',
      value: finalList.length - verifiedInFinal,
    },
    {
      metric: 'Target terpenuhi',
      value: targetStatus(finalList.length, verifiedInFinal, targetCount),
    },
  ];
  summarySheet.addRows(summaryRows);
  stripeRows(summarySheet, summaryRows.length, SUMMARY_COLUMNS.length);

  const logSheet = workbook.addWorksheet('Log');
  styleSheet(logSheet, LOG_COLUMNS);
  const logRows = [
    { metric: 'Waktu generate', value: generatedAt.toISOString() },
    { metric: 'Sumber', value: runMeta.source },
    { metric: 'Actor', value: runMeta.actorId },
    { metric: 'Run ID', value: runMeta.runId },
    { metric: 'Dataset ID', value: runMeta.datasetId },
    { metric: 'Max place per keyword', value: runMeta.maxPlacesPerSearch ?? '' },
    { metric: 'Max review per place', value: runMeta.maxReviewsPerPlace ?? '' },
    { metric: 'Biaya run (USD)', value: runMeta.costUsd ?? '-' },
    { metric: 'Batas biaya (USD)', value: runMeta.maxTotalChargeUsd ?? '-' },
    { metric: 'Enrichment kontak Apify', value: runMeta.contactsEnrichment ? 'Aktif' : 'Nonaktif' },
    { metric: 'Enrichment bukti usia', value: runMeta.enrichmentEnabled ? 'Aktif' : 'Nonaktif' },
    { metric: 'Keyword dipakai', value: searchStrings.join(', ') },
  ];
  logSheet.addRows(logRows);
  stripeRows(logSheet, logRows.length, LOG_COLUMNS.length);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
