import { domainOf } from './normalize.js';
import crypto from 'node:crypto';

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

export function isSurabayaCity(value) {
  const city = normalizeName(value);
  return (
    city === 'surabaya' ||
    city === 'kota surabaya' ||
    city === 'surabaya city' ||
    city.startsWith('surabaya ')
  );
}

export function isGenericDomain(domain) {
  const text = String(domain ?? '').toLowerCase().replace(/^www\./, '');
  return GENERIC_DOMAINS.has(text);
}

export function stableId(name, address = '') {
  const hash = crypto
    .createHash('sha1')
    .update(`${normalizeName(name)}|${normalizeName(address)}`)
    .digest('hex')
    .slice(0, 16);
  return `row-${hash}`;
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
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

function closeCoordinates(a, b, threshold = 0.0006) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return false;
  }
  return (
    Math.abs(Number(a.latitude) - Number(b.latitude)) <= threshold &&
    Math.abs(Number(a.longitude) - Number(b.longitude)) <= threshold
  );
}

function findRoot(parent, index) {
  let current = index;
  while (parent[current] !== current) {
    parent[current] = parent[parent[current]];
    current = parent[current];
  }
  return current;
}

function union(parent, a, b) {
  const rootA = findRoot(parent, a);
  const rootB = findRoot(parent, b);
  if (rootA !== rootB) parent[rootB] = rootA;
}

/**
 * Mendeteksi kemungkinan duplikat tanpa menghapus data.
 * Sinyal kuat: nama sama, telepon sama, atau koordinat sangat dekat + nama mirip.
 * Domain sama + nama mirip hanya dilaporkan karena bisa jadi cabang berbeda.
 */
export function findPossibleDuplicates(studios) {
  const items = studios.filter((studio) => studio && studio.name);
  const parent = items.map((_, index) => index);
  const edges = [];

  const connect = (a, b, reason) => {
    union(parent, a, b);
    edges.push({ a, b, reason });
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

    const domain = String(studio.domain || domainOf(studio.website) || '')
      .toLowerCase()
      .replace(/^www\./, '');
    if (domain && !isGenericDomain(domain)) {
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(index);
    }
  });

  for (const indices of byName.values()) {
    for (let i = 1; i < indices.length; i += 1) connect(indices[0], indices[i], 'nama sama');
  }

  for (const indices of byPhone.values()) {
    for (let i = 1; i < indices.length; i += 1) connect(indices[0], indices[i], 'telepon sama');
  }

  for (const indices of byDomain.values()) {
    for (let i = 0; i < indices.length; i += 1) {
      for (let j = i + 1; j < indices.length; j += 1) {
        if (nameSimilarity(items[indices[i]].name, items[indices[j]].name) >= 0.7) {
          connect(indices[i], indices[j], 'domain + nama mirip');
        }
      }
    }
  }

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (
        closeCoordinates(items[i], items[j]) &&
        nameSimilarity(items[i].name, items[j].name) >= 0.8
      ) {
        connect(i, j, 'koordinat dekat + nama mirip');
      }
    }
  }

  const groups = new Map();
  items.forEach((_, index) => {
    const root = findRoot(parent, index);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root).add(index);
  });

  const reasonsByRoot = new Map();
  for (const edge of edges) {
    const root = findRoot(parent, edge.a);
    if (!reasonsByRoot.has(root)) reasonsByRoot.set(root, new Set());
    reasonsByRoot.get(root).add(edge.reason);
  }

  return [...groups.entries()]
    .filter(([, indices]) => indices.size > 1)
    .map(([root, indices]) => {
      const members = [...indices].map((index) => items[index]);
      return {
        names: members.map((studio) => studio.name),
        ids: members.map((studio) => studio.id),
        reasons: [...(reasonsByRoot.get(root) ?? [])],
      };
    })
    .sort((a, b) => b.names.length - a.names.length || a.names[0].localeCompare(b.names[0]));
}
