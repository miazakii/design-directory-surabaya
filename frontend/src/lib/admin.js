export const FIELDS = [
  { key: 'name', label: 'Nama Studio', type: 'text' },
  { key: 'category', label: 'Kategori (mentah)', type: 'text' },
  { key: 'group', label: 'Kategori / Legend', type: 'group' },
  { key: 'address', label: 'Alamat', type: 'text' },
  { key: 'city', label: 'Kota', type: 'text' },
  { key: 'postalCode', label: 'Kode Pos', type: 'text' },
  { key: 'phone', label: 'Telepon', type: 'text' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'emails', label: 'Email (satu per baris)', type: 'textarea', array: true },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'facebook', label: 'Facebook', type: 'text' },
  { key: 'linkedin', label: 'LinkedIn', type: 'text' },
  { key: 'youtube', label: 'YouTube', type: 'text' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Jumlah Review', type: 'number' },
  { key: 'openingHours', label: 'Jam Buka (satu per baris)', type: 'textarea', array: true },
  { key: 'latitude', label: 'Latitude', type: 'number' },
  { key: 'longitude', label: 'Longitude', type: 'number' },
  { key: 'mapsUrl', label: 'Google Maps URL', type: 'text' },
  { key: 'placeId', label: 'Place ID', type: 'text' },
  { key: 'ageStatusCode', label: 'Status Usia', type: 'select' },
  { key: 'confidence', label: 'Skor Keyakinan', type: 'number' },
  { key: 'foundedYear', label: 'Tahun Berdiri', type: 'number' },
  { key: 'ageYears', label: 'Usia (tahun)', type: 'number' },
  { key: 'ageSummary', label: 'Sinyal Usia', type: 'textarea' },
  { key: 'evidenceUrl', label: 'Link Bukti', type: 'text' },
  { key: 'sourceKeyword', label: 'Keyword Sumber', type: 'text' },
  { key: 'outsideSurabaya', label: 'Di luar Surabaya', type: 'switch' },
];

export const ARRAY_FIELDS = FIELDS.filter((field) => field.array).map((field) => field.key);
export const NUMBER_FIELDS = FIELDS.filter((field) => field.type === 'number').map((field) => field.key);

export function minYearsValue(data) {
  return Number(data?.minYears) || 2;
}

export function ageStatusLabel(code, minYears) {
  switch (code) {
    case 'verified':
      return `Usia terverifikasi (>= ${minYears} tahun)`;
    case 'young':
      return `Kemungkinan < ${minYears} tahun`;
    case 'manual':
      return 'Perlu cek manual';
    case 'unknown':
      return 'Tidak dapat dipastikan';
    default:
      return '';
  }
}

export function ageStatusFromLabel(label) {
  const text = String(label ?? '').trim();
  if (text.startsWith('Usia terverifikasi')) return 'verified';
  if (text.startsWith('Kemungkinan <')) return 'young';
  if (text === 'Perlu cek manual') return 'manual';
  if (text === 'Tidak dapat dipastikan') return 'unknown';
  return '';
}

export function ageStatusOptions(selected, minYears) {
  return [
    ['', '—'],
    ['verified', `Terverifikasi (>= ${minYears} tahun)`],
    ['manual', 'Perlu cek manual'],
    ['unknown', 'Tidak dapat dipastikan'],
    ['young', `Kemungkinan < ${minYears} tahun`],
  ].map(([value, label]) => ({ value, label }));
}

export function normalizeStudio(studio, data) {
  const next = { ...studio };
  for (const key of ARRAY_FIELDS) {
    next[key] = Array.isArray(next[key])
      ? next[key].map((entry) => String(entry).trim()).filter(Boolean)
      : [];
  }
  if (next.ageStatusCode !== undefined) {
    next.ageStatusCode = next.ageStatusCode || '';
    next.ageStatus = ageStatusLabel(next.ageStatusCode, minYearsValue(data));
    next.needsReview = ['manual', 'unknown'].includes(next.ageStatusCode);
  }
  return next;
}

export function validateData(data) {
  const errors = [];
  const groups = Array.isArray(data.groups) ? data.groups : [];
  if (groups.length === 0) errors.push('Minimal satu kategori.');

  const groupKeys = new Set();
  groups.forEach((group, index) => {
    if (!group.key || !String(group.key).trim()) errors.push(`Kategori #${index + 1} belum punya key.`);
    else if (groupKeys.has(group.key)) errors.push(`Key kategori duplikat: ${group.key}.`);
    else groupKeys.add(group.key);
    if (!group.label || !String(group.label).trim()) errors.push(`Kategori #${index + 1} belum punya label.`);
    if (!/^#[0-9a-f]{6}$/i.test(String(group.color || ''))) {
      errors.push(`Kategori #${index + 1}: warna harus format #RRGGBB.`);
    }
  });

  if (!Array.isArray(data.studios)) {
    errors.push('Daftar studio tidak valid.');
    return errors;
  }

  const ids = new Set();
  data.studios.forEach((studio, index) => {
    const label = studio.name ? `"${studio.name}"` : `baris ${index + 1}`;
    if (!studio.id || !String(studio.id).trim()) errors.push(`${label}: ID wajib diisi.`);
    else if (ids.has(studio.id)) errors.push(`${label}: ID duplikat.`);
    else ids.add(studio.id);
    if (!studio.name || !String(studio.name).trim()) errors.push(`Baris ${index + 1}: nama wajib diisi.`);
    if (!studio.group || !String(studio.group).trim()) errors.push(`${label}: kategori wajib dipilih.`);

    if (studio.rating != null && studio.rating !== '') {
      const rating = Number(studio.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.push(`${label}: rating harus 0–5.`);
    }
    for (const [key, min, max] of [
      ['latitude', -90, 90],
      ['longitude', -180, 180],
    ]) {
      if (studio[key] == null || studio[key] === '') continue;
      const value = Number(studio[key]);
      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${label}: ${key} harus ${min}–${max}.`);
      }
    }
  });

  if (!Array.isArray(data.notes)) errors.push('Catatan data tidak valid.');
  return errors;
}

export function makeNewStudio(data) {
  return {
    id: `new-${Date.now()}`,
    no: (data.studios?.length || 0) + 1,
    name: 'Studio Baru',
    category: '',
    group: data.groups?.[0]?.key || 'other',
    address: '',
    city: 'Surabaya',
    postalCode: '',
    phone: '',
    website: '',
    emails: [],
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
    rating: null,
    reviews: 0,
    openingHours: [],
    latitude: null,
    longitude: null,
    mapsUrl: '',
    placeId: '',
    ageStatusCode: '',
    ageStatus: '',
    confidence: 0,
    foundedYear: null,
    ageYears: null,
    ageSummary: '',
    evidenceUrl: '',
    sourceKeyword: '',
    needsReview: false,
    outsideSurabaya: false,
  };
}

const byKeys = (...keys) => keys.map((key) => FIELDS.find((field) => field.key === key)).filter(Boolean);

export const FIELD_SECTIONS = [
  {
    title: 'Profil',
    description: 'Identitas utama studio di direktori.',
    fields: byKeys('name', 'category', 'group', 'address', 'city', 'postalCode'),
  },
  {
    title: 'Kontak',
    description: 'Kanal yang bisa dihubungi publik.',
    fields: byKeys('phone', 'website', 'emails', 'instagram', 'facebook', 'linkedin', 'youtube'),
  },
  {
    title: 'Lokasi & tautan',
    description: 'Koordinat dipakai untuk titik di peta.',
    fields: byKeys('latitude', 'longitude', 'mapsUrl', 'placeId'),
  },
  {
    title: 'Usia & verifikasi',
    description: 'Status ini tampil di kartu dan halaman profil.',
    fields: byKeys('ageStatusCode', 'confidence', 'foundedYear', 'ageYears', 'ageSummary', 'evidenceUrl', 'sourceKeyword', 'outsideSurabaya'),
  },
  {
    title: 'Metadata',
    description: 'Rating, ulasan, dan jam buka dari sumber asli.',
    fields: byKeys('rating', 'reviews', 'openingHours'),
  },
];
