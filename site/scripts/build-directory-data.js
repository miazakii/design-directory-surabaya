import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CSV_PATH = path.join(ROOT, 'data', 'studio-desain-surabaya.csv');
const OUT_PATH = path.join(ROOT, 'site', 'js', 'directory-data.js');

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

const GROUP_BY_KEY = new Map(GROUPS.map((group) => [group.key, group]));

// Manual, data-quality observations surfaced on the site rather than silently
// mutating the source rows.
const DATA_NOTES = [
  'VisualCast muncul dua kali (No. 33 & 34) — kemungkinan entitas yang sama.',
  'SENAYA CREATIVE (No. 93) berlokasi di Kabupaten Gresik, bukan Surabaya.',
  'Beberapa baris berstatus "Perlu cek manual" / "Tidak dapat dipastikan" (usia belum terbukti).',
  'Beberapa listing generik (mis. "DESAIN BANNER", "RADJA KEMASAN") perlu kurasi lanjutan.',
];

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
  const group = GROUP_BY_KEY.get(groupKey);
  const rating = toNumber(raw.Rating);
  const ageStatus = raw['Status Usia'] ?? '';
  const city = raw.Kota ?? '';

  return {
    id: raw['Place ID'] || `row-${index + 1}`,
    no: index + 1,
    name: raw['Nama Studio'] ?? '',
    category,
    group: groupKey,
    groupLabel: group?.label ?? 'Lainnya',
    groupColor: group?.color ?? '#8D99AE',
    address: raw.Alamat ?? '',
    city,
    postalCode: raw['Kode Pos'] ?? '',
    phone: raw.Telepon ?? '',
    website: raw.Website ?? '',
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
    ageStatus,
    confidence: toInteger(raw['Skor Keyakinan']) ?? 0,
    foundedYear: toInteger(raw['Estimasi Tahun Berdiri']),
    ageYears: toNumber(raw['Usia (tahun)']),
    ageSummary: raw['Sinyal Usia'] ?? '',
    evidenceUrl: raw['Bukti Utama'] ?? '',
    sourceKeyword: raw['Ditemukan via Keyword'] ?? '',
    needsReview: ageStatus === 'Perlu cek manual' || ageStatus === 'Tidak dapat dipastikan',
    outsideSurabaya: city.length > 0 && city.toLowerCase() !== 'surabaya',
  };
}

function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseDelimited(text, CSV_DELIMITER);

  if (rows.length < 2) {
    throw new Error('CSV kosong atau hanya berisi header.');
  }

  const headers = rows[0].map((header) => header.trim());
  const records = [];

  for (let i = 1; i < rows.length; i += 1) {
    const raw = {};
    headers.forEach((header, column) => {
      raw[header] = rows[i][column] ?? '';
    });
    records.push(normalizeRow(raw, i - 1));
  }

  const verified = records.filter(
    (record) => record.ageStatus === 'Usia terverifikasi (>= 2 tahun)',
  ).length;

  const meta = {
    title: 'Design Directory Surabaya',
    generatedAt: new Date().toISOString(),
    total: records.length,
    verified,
    groups: GROUPS,
    notes: DATA_NOTES,
  };

  const output = [
    '// Generated by scripts/build-directory-data.js from data/studio-desain-surabaya.csv.',
    '// Do not edit by hand.',
    `window.DIRECTORY_META = ${JSON.stringify(meta, null, 2)};`,
    `window.DIRECTORY_DATA = ${JSON.stringify(records, null, 2)};`,
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, output, 'utf8');

  console.log(`Wrote ${records.length} studios -> ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Verified age: ${verified}`);
}

main();
