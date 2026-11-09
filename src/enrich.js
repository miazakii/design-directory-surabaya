import { config } from './config.js';
import { sanitizeEmails, sanitizeSocials } from './normalize.js';
import { sleep } from './utils.js';

const COPYRIGHT_RE =
  /(?:©|&copy;|copyright|all rights reserved)[^0-9]{0,40}((?:19|20)\d{2})(?:\s*(?:-|–|—|to)\s*((?:19|20)\d{2}))?/gi;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const INSTAGRAM_RE = /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]{2,40}/gi;
const FACEBOOK_RE = /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._-]{2,60}/gi;
const LINKEDIN_RE = /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9._-]{2,60}/gi;
const SOCIAL_NOISE = /\/(p|reel|reels|explore|stories|share|login|signup|privacy|policies)\b/i;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const HOST_BLOCK_MS = 60_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const blockedHosts = new Map();

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function isHostBlocked(url) {
  const host = hostOf(url);
  if (!host) return false;
  const until = blockedHosts.get(host) ?? 0;
  if (until <= Date.now()) {
    blockedHosts.delete(host);
    return false;
  }
  return true;
}

function blockHost(url, ms) {
  const host = hostOf(url);
  if (host) blockedHosts.set(host, Date.now() + ms);
}

async function readTextLimited(response, maxBytes = MAX_HTML_BYTES) {
  if (!response.body) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = maxBytes - total;
    if (remaining <= 0) {
      await reader.cancel();
      break;
    }
    chunks.push(Buffer.from(value.buffer, value.byteOffset, Math.min(value.byteLength, remaining)));
    total += Math.min(value.byteLength, remaining);
    if (total >= maxBytes) {
      await reader.cancel();
      break;
    }
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function request(url, parse, options = {}) {
  const { attempts = 1, retryDelayMs = 2500, state } = options;
  let exhausted = false;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (isHostBlocked(url)) {
      exhausted = true;
      break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.enrichment.httpTimeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'user-agent': config.enrichment.userAgent,
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
      });
      if (response.ok) return await parse(response);
      if (response.status === 429 || response.status === 503) {
        const retryAfter = Number(response.headers.get('retry-after'));
        blockHost(
          url,
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : HOST_BLOCK_MS,
        );
      }
      if (!RETRYABLE_STATUS.has(response.status)) return null;
      exhausted = true;
    } catch {
      exhausted = true;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  if (state && exhausted) state.unavailable = true;
  return null;
}

function unique(values) {
  return [...new Set(values)];
}

function extractSocials(html, pattern) {
  return unique(
    (html.match(pattern) ?? [])
      .map((url) => url.replace(/["'<\\].*$/, '').replace(/\/+$/, ''))
      .filter((url) => !SOCIAL_NOISE.test(url)),
  ).slice(0, 3);
}

async function websiteFacts(url, state) {
  const html = await request(url, (response) => readTextLimited(response), {
    attempts: 2,
    state,
  });
  if (!html) return { reachable: false };

  const currentYear = new Date().getFullYear();
  const years = [];
  for (const match of html.matchAll(COPYRIGHT_RE)) {
    for (const candidate of [match[1], match[2]]) {
      const year = Number(candidate);
      if (Number.isFinite(year) && year >= 1995 && year <= currentYear + 1) years.push(year);
    }
  }

  return {
    reachable: true,
    url,
    copyrightYear: years.length ? Math.min(...years) : null,
    emails: sanitizeEmails(html.match(EMAIL_RE) ?? []).slice(0, 10),
    instagrams: extractSocials(html, INSTAGRAM_RE),
    facebooks: extractSocials(html, FACEBOOK_RE),
    linkedIns: extractSocials(html, LINKEDIN_RE),
  };
}

async function waybackFirstCapture(domain, state) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
    domain,
  )}&output=json&limit=1&sort=asc&fl=timestamp,original`;
  const rows = await request(api, (response) => response.json(), { attempts: 3, state });
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const [timestamp, original] = rows[1];
  if (!/^\d{14}$/.test(String(timestamp))) return null;

  return {
    date: `${String(timestamp).slice(0, 4)}-${String(timestamp).slice(4, 6)}-${String(timestamp).slice(6, 8)}`,
    evidenceUrl: `https://web.archive.org/web/${timestamp}/${original || domain}`,
  };
}

async function domainRegistration(domain, state) {
  const data = await request(
    `https://rdap.org/domain/${encodeURIComponent(domain)}`,
    (response) => response.json(),
    { attempts: 3, state },
  );
  const events = Array.isArray(data?.events) ? data.events : [];
  const registration =
    events.find((event) => event.eventAction === 'registration') ??
    events.find((event) => event.eventAction === 'creation');
  if (!registration?.eventDate) return null;

  return {
    date: String(registration.eventDate).slice(0, 10),
    evidenceUrl: `https://rdap.org/domain/${domain}`,
  };
}

function makeSignal(type, label, date, url, weight, detail) {
  return { type, label, date, url: url ?? '', weight, detail };
}

async function fetchEnrichment(place) {
  const state = { unavailable: false };

  const [site, wayback, registration] = await Promise.all([
    config.enrichment.website && place.website ? websiteFacts(place.website, state) : null,
    config.enrichment.wayback && place.domain ? waybackFirstCapture(place.domain, state) : null,
    config.enrichment.rdap && place.domain ? domainRegistration(place.domain, state) : null,
  ]);

  const signals = [];
  const oldestReview = place.reviewDates[0];

  if (oldestReview) {
    signals.push(
      makeSignal(
        'reviews',
        `Review tertua dalam sampel ${oldestReview.slice(0, 10)}`,
        oldestReview,
        place.mapsUrl,
        config.weights.reviews,
        `${place.reviewDates.length} review terbaru dianalisis; yang tertua dalam sampel dipublikasikan ${oldestReview.slice(0, 10)}. Ini batas bawah aktivitas, bukan review pertama sepanjang sejarah.`,
      ),
    );
  }

  if (wayback) {
    signals.push(
      makeSignal(
        'wayback',
        `Situs terarsip sejak ${wayback.date}`,
        wayback.date,
        wayback.evidenceUrl,
        config.weights.wayback,
        `Snapshot tertua Wayback Machine untuk ${place.domain} adalah ${wayback.date}`,
      ),
    );
  }

  if (registration) {
    signals.push(
      makeSignal(
        'domain',
        `Domain terdaftar ${registration.date}`,
        registration.date,
        registration.evidenceUrl,
        config.weights.domain,
        `Tanggal registrasi domain ${place.domain} menurut RDAP`,
      ),
    );
  }

  if (site?.copyrightYear) {
    signals.push(
      makeSignal(
        'copyright',
        `Copyright website ${site.copyrightYear}`,
        `${site.copyrightYear}-01-01`,
        site.url,
        config.weights.copyright,
        'Tahun copyright paling awal di halaman utama website',
      ),
    );
  }

  return {
    partial: state.unavailable,
    data: {
      ageSignals: signals,
      websiteReachable: Boolean(site?.reachable),
      emails: sanitizeEmails([...place.emails, ...(site?.emails ?? [])]),
      instagrams: sanitizeSocials([...place.instagrams, ...(site?.instagrams ?? [])]),
      facebooks: sanitizeSocials([...place.facebooks, ...(site?.facebooks ?? [])]),
      linkedIns: sanitizeSocials([...place.linkedIns, ...(site?.linkedIns ?? [])]),
    },
  };
}

export async function enrichPlace(place, cache) {
  const key = place.placeId || place.domain || place.name;
  const entry = cache?.[key];

  if (entry && typeof entry.fetchedAt === 'number') {
    const maxAge = entry.partial
      ? config.enrichment.partialCacheMaxAgeMs
      : config.enrichment.cacheMaxAgeMs;
    if (Date.now() - entry.fetchedAt < maxAge) return entry.data;
  }

  const { data, partial } = await fetchEnrichment(place);
  if (cache) cache[key] = { fetchedAt: Date.now(), data, partial };
  return data;
}
