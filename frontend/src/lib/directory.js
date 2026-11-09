export const FALLBACK_GROUP = { key: 'other', label: 'Lainnya', color: '#8D99AE' };

export function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : FALLBACK_GROUP.color;
}

export function safeUrl(url) {
  const text = String(url ?? '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text)) return `https://${text}`;
  return '';
}

export function isVerified(studio) {
  return (
    studio?.ageStatusCode === 'verified' ||
    String(studio?.ageStatus || '').startsWith('Usia terverifikasi')
  );
}

export function hasContact(studio) {
  return Boolean(
    studio?.phone ||
      studio?.website ||
      studio?.instagram ||
      studio?.facebook ||
      studio?.linkedin ||
      studio?.youtube ||
      (Array.isArray(studio?.emails) && studio.emails.length > 0),
  );
}

export function hasCoords(studio) {
  return studio?.latitude != null && studio?.longitude != null;
}

export function groupMap(groups) {
  return new Map((groups || []).map((group) => [group.key, group]));
}

export function groupInfo(map, studio) {
  return map.get(studio?.group) || FALLBACK_GROUP;
}

export function ratingText(studio) {
  if (studio?.rating == null || studio.rating === '') return '';
  const rating = Number(studio.rating);
  if (!Number.isFinite(rating)) return '';
  const reviews = Number.isFinite(Number(studio.reviews)) ? Number(studio.reviews) : 0;
  return `${rating.toFixed(1).replace('.', ',')} (${reviews})`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function studioPageUrl(id) {
  return `studios/${encodeURIComponent(id)}.html`;
}

export async function loadDirectory(signal) {
  const response = await fetch('data/directory.json', { cache: 'no-cache', signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const json = await response.json();
  return {
    ...json,
    studios: Array.isArray(json.studios) ? json.studios : [],
    groups: Array.isArray(json.groups) ? json.groups : [],
    notes: Array.isArray(json.notes) ? json.notes : [],
  };
}
