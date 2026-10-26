import { dedupeStrings } from './utils.js';

const CONTACT_NOISE_RE =
  /(sentry|wixpress|example\.|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|godaddy|squarespace|wix\.com|wordpress|cloudflare|hostinger|niagahoster|rumahweb|idcloudhost|domainesia|masterweb|namecheap|bluehost|hostgator|siteground|shopify|myshopify|sedo|afternic|hugedomains|dan\.com|parklogic|bodis|parkingcrew|domain\.com|email\.com|email@address|your@email|nama@|sentry\.io)/i;

export function sanitizeEmails(values) {
  return dedupeStrings(
    values
      .map((value) => value.toLowerCase().replace(/\.$/, ''))
      .filter((value) => value.includes('@') && !CONTACT_NOISE_RE.test(value)),
  );
}

export function sanitizeSocials(values) {
  return dedupeStrings(values.filter((value) => !CONTACT_NOISE_RE.test(value)));
}

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function toStringList(...values) {
  const flat = [];
  for (const value of values) {
    if (!value) continue;
    const list = Array.isArray(value) ? value : [value];
    for (const entry of list) {
      if (entry === null || entry === undefined) continue;
      if (typeof entry === 'object') {
        flat.push(text(entry.value ?? entry.email ?? entry.url ?? entry.name ?? entry.text ?? ''));
      } else {
        flat.push(text(entry));
      }
    }
  }
  return dedupeStrings(flat);
}

export function domainOf(url) {
  const raw = text(url);
  if (!raw) return '';
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function reviewDatesOf(item) {
  const reviews = Array.isArray(item.reviews) ? item.reviews : [];
  return dedupeStrings(
    reviews.map((review) => text(review.publishedAtDate ?? review.publishAt ?? review.publishedAt)),
  ).sort();
}

export function normalizePlace(item) {
  const contacts = item.contacts ?? {};
  const website = text(item.website);
  const reviews = Array.isArray(item.reviews) ? item.reviews : [];

  return {
    placeId: text(item.placeId ?? item.fid),
    name: text(item.title ?? item.name),
    categoryName: text(item.categoryName ?? item.category),
    categories: toStringList(item.categories),
    address: text(item.address ?? item.fullAddress),
    city: text(item.city),
    postalCode: text(item.postalCode),
    phone: text(item.phone ?? item.phoneUnformatted),
    website,
    domain: domainOf(website),
    rating: typeof item.totalScore === 'number' ? item.totalScore : null,
    reviewsCount: Number(item.reviewsCount ?? reviews.length) || 0,
    openingHours: Array.isArray(item.openingHours)
      ? item.openingHours.map((slot) => `${text(slot.day)}: ${text(slot.hours)}`).join('; ')
      : '',
    latitude: item.location?.lat ?? null,
    longitude: item.location?.lng ?? null,
    mapsUrl: text(item.url),
    closed: Boolean(item.permanentlyClosed || item.temporarilyClosed),
    emails: sanitizeEmails(toStringList(item.emails, contacts.emails)),
    instagrams: sanitizeSocials(toStringList(item.instagrams, contacts.instagrams)),
    facebooks: sanitizeSocials(toStringList(item.facebooks, contacts.facebooks)),
    linkedIns: sanitizeSocials(toStringList(item.linkedIns, contacts.linkedIns)),
    twitters: sanitizeSocials(toStringList(item.twitters, contacts.twitters)),
    youtubes: sanitizeSocials(toStringList(item.youtubes, contacts.youtubes)),
    reviewDates: reviewDatesOf(item),
    sources: toStringList(item.searchString),
    ageSignals: [],
  };
}

export function mergePlace(a, b) {
  return {
    ...a,
    categoryName: a.categoryName || b.categoryName,
    categories: dedupeStrings([...a.categories, ...b.categories]),
    address: a.address || b.address,
    city: a.city || b.city,
    postalCode: a.postalCode || b.postalCode,
    phone: a.phone || b.phone,
    website: a.website || b.website,
    domain: a.domain || b.domain,
    rating: a.rating ?? b.rating,
    reviewsCount: Math.max(a.reviewsCount ?? 0, b.reviewsCount ?? 0),
    openingHours: a.openingHours || b.openingHours,
    latitude: a.latitude ?? b.latitude,
    longitude: a.longitude ?? b.longitude,
    mapsUrl: a.mapsUrl || b.mapsUrl,
    closed: a.closed || b.closed,
    emails: dedupeStrings([...a.emails, ...b.emails]),
    instagrams: dedupeStrings([...a.instagrams, ...b.instagrams]),
    facebooks: dedupeStrings([...a.facebooks, ...b.facebooks]),
    linkedIns: dedupeStrings([...a.linkedIns, ...b.linkedIns]),
    twitters: dedupeStrings([...a.twitters, ...b.twitters]),
    youtubes: dedupeStrings([...a.youtubes, ...b.youtubes]),
    reviewDates: dedupeStrings([...a.reviewDates, ...b.reviewDates]).sort(),
    sources: dedupeStrings([...a.sources, ...b.sources]),
  };
}
