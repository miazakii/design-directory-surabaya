import { hasContact, hasCoords, isVerified, safeUrl } from './directory.js';

const GENERIC_DOMAINS = new Set([
  'behance.net',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'linktr.ee',
  'medium.com',
  'notion.site',
  'tiktok.com',
  'twitter.com',
  'wa.me',
  'wordpress.com',
  'wixsite.com',
  'youtube.com',
]);

export function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function domainOf(url) {
  const href = safeUrl(url);
  if (!href || !/^https?:/i.test(href)) return '';
  try {
    return new URL(href).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function nameSimilarity(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length >= 5 && right.length >= 5 && (left.includes(right) || right.includes(left))) {
    return 0.9;
  }
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / union.size;
}

export function findDuplicateGroups(studios) {
  const items = studios.filter((studio) => studio?.name);
  const parent = items.map((_, index) => index);
  const reasons = new Map();

  const find = (index) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const union = (a, b, reason) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
    const root = find(a);
    if (!reasons.has(root)) reasons.set(root, new Set());
    reasons.get(root).add(reason);
  };

  const byName = new Map();
  const byPhone = new Map();
  const byDomain = new Map();

  items.forEach((studio, index) => {
    const name = normalizeName(studio.name);
    if (name.length >= 4) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(index);
    }
    const phone = normalizePhone(studio.phone);
    if (phone.length >= 8) {
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(index);
    }
    const domain = String(studio.domain || domainOf(studio.website) || '').toLowerCase();
    if (domain && !GENERIC_DOMAINS.has(domain)) {
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(index);
    }
  });

  for (const indices of byName.values()) {
    for (let i = 1; i < indices.length; i += 1) union(indices[0], indices[i], 'nama sama');
  }
  for (const indices of byPhone.values()) {
    for (let i = 1; i < indices.length; i += 1) union(indices[0], indices[i], 'telepon sama');
  }
  for (const indices of byDomain.values()) {
    for (let i = 0; i < indices.length; i += 1) {
      for (let j = i + 1; j < indices.length; j += 1) {
        if (nameSimilarity(items[indices[i]].name, items[indices[j]].name) >= 0.7) {
          union(indices[i], indices[j], 'domain + nama mirip');
        }
      }
    }
  }

  const groups = new Map();
  items.forEach((_, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(items[index]);
  });

  return [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => ({
      studios: members,
      reasons: [...(reasons.get(find(items.indexOf(members[0]))) || [])],
    }))
    .sort((a, b) => b.studios.length - a.studios.length);
}

const COMPLETENESS_FIELDS = [
  ['name', 'Nama'],
  ['group', 'Kategori'],
  ['address', 'Alamat'],
  ['city', 'Kota'],
  ['phone', 'Telepon'],
  ['website', 'Website'],
  ['latitude', 'Koordinat'],
  ['ageStatusCode', 'Status usia'],
  ['ageSummary', 'Sinyal usia'],
  ['evidenceUrl', 'Bukti usia'],
];

export function studioCompleteness(studio) {
  const missing = COMPLETENESS_FIELDS.filter(([key]) => {
    if (key === 'latitude') return !hasCoords(studio);
    return studio?.[key] == null || String(studio[key]).trim() === '';
  }).map(([, label]) => label);
  return {
    score: COMPLETENESS_FIELDS.length - missing.length,
    total: COMPLETENESS_FIELDS.length,
    missing,
  };
}

export function reviewReasons(studio) {
  const reasons = [];
  if (studio?.needsReview || ['manual', 'unknown'].includes(studio?.ageStatusCode)) {
    reasons.push('Usia perlu dicek');
  }
  if (studio?.outsideSurabaya) reasons.push('Di luar Surabaya');
  if (!hasContact(studio)) reasons.push('Belum ada kontak');
  if (!hasCoords(studio)) reasons.push('Belum ada koordinat');
  if (!isVerified(studio)) reasons.push('Belum terverifikasi');
  return reasons;
}

export function reviewQueue(studios) {
  return studios
    .map((studio) => ({ studio, reasons: reviewReasons(studio) }))
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);
}
