import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGE_STATUS, ageStatusFromLabel, ageStatusLabel } from '../../src/age.js';
import { findPossibleDuplicates, isSurabayaCity, stableId } from '../../src/data-quality.js';
import { domainOf } from '../../src/normalize.js';
import { validateDirectory } from '../../src/validate-directory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CSV_PATH = path.join(ROOT, 'data', 'studio-desain-surabaya.csv');
const MIN_YEARS = Number(process.env.MIN_YEARS ?? 2);

const args = process.argv.slice(2);
const force = args.includes('--force');
const resetMetadata = args.includes('--reset-metadata');
const outIndex = args.indexOf('--out');
const outValue = outIndex >= 0 ? args[outIndex + 1] : '';

if (outIndex >= 0 && (!outValue || outValue.startsWith('--'))) {
  console.error('Opsi --out membutuhkan path file.');
  process.exit(1);
}

const OUT_PATH = outValue
  ? path.resolve(outValue)
  : path.join(ROOT, 'site', 'data', 'directory.json');

const CSV_DELIMITER = ';';

// Broad display groups derived from Google's raw primary category.
const CATEGORY_GROUPS = {
  'Agensi desain': 'agency',
  'Agensi penjenamaan': 'branding',
  'Konsultan citra': 'branding',
  'Konsultan': 'branding',
  'Konsultan media': 'branding',
  'Konsultan Manajemen Bisnis': 'branding',
  'Perancang Grafis': 'visual',
  'Perancang Situs Web': 'digital',
  'Biro Iklan': 'advertising',
  'Jasa Periklanan': 'advertising',
  'Perusahaan Media': 'media',
  'Perusahaan desain industri': 'product',
  'Perusahaan desain model': 'product',
  'Studio seni': 'art',
  'Studio animasi': 'art',
  'Galeri Seni': 'art',
  'Kantor Perusahaan': 'other',
  'Asosiasi/organisasi': 'other',
};

const GROUPS = [
  { key: 'agency', label: 'Agensi Desain', color: '#E63946' },
  { key: 'branding', label: 'Branding & Konsultan', color: '#E76F51' },
  { key: 'visual', label: 'Grafis & Visual', color: '#2A9D8F' },
  { key: 'digital', label: 'Digital & Web', color: '#457B9D' },
  { key: 'advertising', label: 'Periklanan', color: '#9B5DE5' },
  { key: 'media', label: 'Media', color: '#F72585' },
  { key: 'product', label: 'Desain Produk & Industri', color: '#F4A261' },
  { key: 'art', label: 'Seni & Galeri', color: '#06A77D' },
  { key: 'other', label: 'Lainnya', color: '#8D99AE' },
];

// Catatan data dibuat dari hasil pemeriksaan, bukan hardcode per entitas.
function buildDataNotes(records) {
  const notes = [];
  const duplicates = findPossibleDuplicates(records);

  for (const group of duplicates.slice(0, 5)) {
    notes.push(`Kemungkinan duplikat: ${group.names.join(' & ')} (${group.reasons.join(', ')}).`);
  }
  if (duplicates.length > 5) {
    notes.push(`+${duplicates.length - 5} kelompok duplikat lain; jalankan npm run check:data.`);
  }

  const outside = records.filter((record) => record.outsideSurabaya);
  if (outside.length > 0) {
    notes.push(
      `${outside.length} baris berada di luar Kota Surabaya: ${outside
        .slice(0, 3)
        .map((record) => record.name)
        .join(', ')}.`,
    );
  }

  const needsReview = records.filter((record) => record.needsReview).length;
  if (needsReview > 0) {
    notes.push(
      `${needsReview} baris belum terverifikasi usia (status "Perlu cek manual" / "Tidak dapat dipastikan").`,
    );
  }

  const noDigitalContact = records.filter(
    (record) =>
      !record.phone &&
      !record.website &&
      record.emails.length === 0 &&
      !record.instagram &&
      !record.facebook &&
      !record.linkedin,
  ).length;
  if (noDigitalContact > 0) {
    notes.push(`${noDigitalContact} baris hanya punya kontak telepon atau tanpa kontak digital.`);
  }

  if (notes.length === 0) notes.push('Tidak ada anomali data yang terdeteksi otomatis.');
  notes.push('Status usia adalah estimasi batas bawah aktivitas, bukan tanggal berdiri resmi.');
  return notes;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRow(raw, index) {
  const category = raw['Kategori Utama'] ?? '';
  const groupKey = CATEGORY_GROUPS[category] ?? 'other';
  const rating = toNumber(raw.Rating);
  const rawAgeStatus = raw['Status Usia'] ?? '';
  const ageStatusCode = ageStatusFromLabel(rawAgeStatus) ?? '';
  const ageStatus = ageStatusCode ? ageStatusLabel(ageStatusCode, MIN_YEARS) : rawAgeStatus;
  const city = raw.Kota ?? '';
  const website = raw.Website ?? '';

  return {
    id: raw['Place ID'] || stableId(raw['Nama Studio'], raw['Alamat']),
    no: index + 1,
    name: raw['Nama Studio'] ?? '',
    category,
    group: groupKey,
    address: raw.Alamat ?? '',
    city,
    postalCode: raw['Kode Pos'] ?? '',
    phone: raw.Telepon ?? '',
    website,
    domain: domainOf(website),
    emails: splitList(raw.Email),
    instagram: raw.Instagram ?? '',
    facebook: raw.Facebook ?? '',
    linkedin: raw.LinkedIn ?? '',
    youtube: raw.YouTube ?? '',
    rating: rating === 0 ? null : rating,
    reviews: toInteger(raw['Jumlah Review']) ?? 0,
    openingHours: splitList(raw['Jam Buka']),
    latitude: toNumber(raw.Latitude),
    longitude: toNumber(raw.Longitude),
    mapsUrl: raw['Google Maps'] ?? '',
    placeId: raw['Place ID'] ?? '',
    ageStatusCode,
    ageStatus,
    confidence: toInteger(raw['Skor Keyakinan']) ?? 0,
    foundedYear: toInteger(raw['Estimasi Tahun Berdiri']),
    ageYears: toNumber(raw['Usia (tahun)']),
    ageSummary: raw['Sinyal Usia'] ?? '',
    evidenceUrl: raw['Bukti Utama'] ?? '',
    sourceKeyword: raw['Ditemukan via Keyword'] ?? '',
    needsReview:
      ageStatusCode === AGE_STATUS.MANUAL ||
      ageStatusCode === AGE_STATUS.UNKNOWN ||
      rawAgeStatus === 'Perlu cek manual' ||
      rawAgeStatus === 'Tidak dapat dipastikan',
    outsideSurabaya: city.length > 0 && !isSurabayaCity(city),
  };
}

function readExistingMetadata(filePath) {
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      groups: Array.isArray(existing.groups) ? existing.groups : null,
      notes: Array.isArray(existing.notes) ? existing.notes : null,
    };
  } catch {
    return { groups: null, notes: null };
  }
}

function backupExisting(filePath) {
  const backupDir = path.join(path.dirname(filePath), 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `directory-${stamp}.json`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseDelimited(text, CSV_DELIMITER);

  if (rows.length < 2) {
    throw new Error('CSV kosong atau hanya berisi header.');
  }

  const headers = rows[0].map((header) => header.trim());
  const requiredHeaders = ['Nama Studio', 'Kategori Utama', 'Place ID'];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Header CSV tidak lengkap: ${missingHeaders.join(', ')}`);
  }

  const exists = fs.existsSync(OUT_PATH);
  if (exists && !force) {
    console.error(`File ${path.relative(ROOT, OUT_PATH)} sudah ada.`);
    console.error('Script ini tidak menimpa data website secara otomatis.');
    console.error('Jika memang ingin rebuild dari CSV, jalankan: npm run import:csv');
    console.error('Atau: node site/scripts/build-directory-data.js --force');
    process.exitCode = 1;
    return;
  }

  const existingMeta = exists ? readExistingMetadata(OUT_PATH) : { groups: null, notes: null };
  if (exists) {
    const backupPath = backupExisting(OUT_PATH);
    console.log(`Backup data lama: ${path.relative(ROOT, backupPath)}`);
  }

  const records = [];

  for (let i = 1; i < rows.length; i += 1) {
    const raw = {};
    headers.forEach((header, column) => {
      raw[header] = rows[i][column] ?? '';
    });
    records.push(normalizeRow(raw, i - 1));
  }

  const verified = records.filter((record) => record.ageStatusCode === AGE_STATUS.VERIFIED).length;

  const payload = {
    schemaVersion: 2,
    title: 'Design Directory Surabaya',
    generatedAt: new Date().toISOString(),
    minYears: MIN_YEARS,
    groups: (!resetMetadata && existingMeta.groups) || GROUPS,
    notes: (!resetMetadata && existingMeta.notes) || buildDataNotes(records),
    studios: records,
  };

  const errors = validateDirectory(payload);
  if (errors.length > 0) {
    throw new Error(`Data direktori tidak valid:\n- ${errors.join('\n- ')}`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${records.length} studios -> ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Verified age: ${verified}`);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) main();

export {
  parseDelimited,
  normalizeRow,
  readExistingMetadata,
  backupExisting,
  buildDataNotes,
  toNumber,
  toInteger,
  splitList,
  main,
};
