import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableId } from '../../src/data-quality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SITE_DIR = path.join(ROOT, 'site');
const DATA_FILE = path.join(SITE_DIR, 'data', 'directory.json');
const CONTENT_FILE = path.join(SITE_DIR, 'data', 'content.json');
const OUT_DIR = path.resolve(ROOT, process.env.SEO_OUT_DIR || 'dist');
const STUDIOS_DIR = path.join(OUT_DIR, 'studios');
let SITE_URL = 'https://miazakii.github.io/design-directory-surabaya';
let SITE_NAME = 'Design Directory Surabaya';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function safeUrl(url) {
  const text = String(url ?? '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text)) return `https://${text}`;
  return '';
}

function truncate(text, max = 160) {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

function safeFileId(id) {
  return String(id || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || stableId('studio');
}

function studioUrl(id) {
  return `${SITE_URL}/studios/${encodeURIComponent(safeFileId(id))}.html`;
}

function mapUrl(id) {
  return `${SITE_URL}/map.html?studio=${encodeURIComponent(id)}`;
}

function socialLinks(studio) {
  return [
    ['Instagram', studio.instagram],
    ['Facebook', studio.facebook],
    ['LinkedIn', studio.linkedin],
    ['YouTube', studio.youtube],
  ]
    .map(([label, url]) => {
      const href = safeUrl(url);
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : '';
    })
    .filter(Boolean);
}

function studioPage(studio, directory) {
  const title = `${studio.name} — ${SITE_NAME}`;
  const address = String(studio.address || '').trim();
  const city = String(studio.city || '').trim();
  const citySuffix = city && !address.toLowerCase().includes(city.toLowerCase()) ? city : '';
  const description = truncate(
    [studio.category, address, citySuffix].filter(Boolean).join(' · ') ||
      'Profil studio desain di Surabaya.',
  );
  const canonical = studioUrl(studio.id);
  const website = safeUrl(studio.website);
  const maps = safeUrl(studio.mapsUrl);
  const email = (studio.emails ?? [])[0];
  const links = [
    website ? `<a href="${esc(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : '',
    email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '',
    ...socialLinks(studio),
    maps ? `<a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Google Maps</a>` : '',
  ].filter(Boolean);
  const sameAs = [
    website,
    safeUrl(studio.instagram),
    safeUrl(studio.facebook),
    safeUrl(studio.linkedin),
    safeUrl(studio.youtube),
  ].filter(Boolean);
  const evidence = safeUrl(studio.evidenceUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: studio.name,
    url: canonical,
    description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: studio.address || '',
      addressLocality: studio.city || 'Surabaya',
      postalCode: studio.postalCode || '',
      addressCountry: 'ID',
    },
    ...(studio.phone ? { telephone: studio.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(studio.latitude != null && studio.longitude != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: Number(studio.latitude),
            longitude: Number(studio.longitude),
          },
        }
      : {}),
    ...(studio.rating != null && studio.reviews
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(studio.rating),
            reviewCount: Number(studio.reviews),
          },
        }
      : {}),
  };

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#ffffff">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE_URL}/og-image.png">
  <link rel="stylesheet" href="../css/fonts.css">
  <link rel="stylesheet" href="../css/style.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <a class="skip-link" href="#main">Lewati ke konten</a>
  <header class="landing-nav">
    <div class="container landing-nav__inner">
      <a class="brand" href="../index.html">${esc(SITE_NAME)}</a>
      <a class="btn btn--ghost" href="../map.html?studio=${encodeURIComponent(studio.id)}">Buka di Peta</a>
    </div>
  </header>

  <main class="section" id="main" tabindex="-1">
    <div class="container" style="max-width:820px;">
      <p class="landing-hero__kicker">${esc(studio.category || 'Studio Desain')}</p>
      <h1 class="landing-hero__title" style="font-size:clamp(32px,5vw,56px);">${esc(studio.name)}</h1>
      <p class="landing-hero__sub">${esc(description)}</p>

      <section class="detail-section">
        <h3>Profil</h3>
        <div class="detail-row"><dt>Kategori</dt><dd>${esc(studio.category || '—')}</dd></div>
        <div class="detail-row"><dt>Alamat</dt><dd>${esc(studio.address || '—')}</dd></div>
        <div class="detail-row"><dt>Kota</dt><dd>${esc(studio.city || '—')}</dd></div>
        ${studio.postalCode ? `<div class="detail-row"><dt>Kode pos</dt><dd>${esc(studio.postalCode)}</dd></div>` : ''}
        ${studio.phone ? `<div class="detail-row"><dt>Telepon</dt><dd>${esc(studio.phone)}</dd></div>` : ''}
        ${studio.rating != null ? `<div class="detail-row"><dt>Rating</dt><dd>${esc(studio.rating)} (${esc(studio.reviews || 0)} review)</dd></div>` : ''}
      </section>

      ${links.length ? `<section class="detail-section"><h3>Kontak & tautan</h3><div class="detail-links">${links.join('')}</div></section>` : ''}

      <section class="detail-section">
        <h3>Usia & verifikasi</h3>
        <div class="detail-row"><dt>Status</dt><dd>${esc(studio.ageStatus || '—')}</dd></div>
        <div class="detail-row"><dt>Skor keyakinan</dt><dd>${esc(studio.confidence ?? 0)}%</dd></div>
        ${studio.foundedYear ? `<div class="detail-row"><dt>Estimasi tahun berdiri</dt><dd>${esc(studio.foundedYear)}</dd></div>` : ''}
        ${studio.ageSummary ? `<div class="detail-row"><dt>Sinyal usia</dt><dd>${esc(studio.ageSummary)}</dd></div>` : ''}
        ${evidence ? `<div class="detail-links"><a href="${esc(evidence)}" target="_blank" rel="noopener noreferrer">Lihat bukti</a></div>` : ''}
      </section>

      <section class="detail-section">
        <p style="color:var(--muted);font-size:13px;">
          Data terakhir dibangun ${esc(String(directory.generatedAt || '').slice(0, 10))}.
          Status usia adalah estimasi batas bawah aktivitas, bukan tanggal berdiri resmi.
          Untuk koreksi atau penghapusan data, gunakan
          <a href="https://github.com/miazakii/design-directory-surabaya/issues/new?template=koreksi-data.yml" target="_blank" rel="noopener noreferrer">formulir koreksi data</a>.
        </p>
      </section>
    </div>
  </main>

  <footer class="landing-footer">
    <div class="container" style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
      <span>${esc(SITE_NAME)} — referensi terbuka.</span>
      <span><a href="../map.html" style="color:var(--muted);">Kembali ke direktori</a> · <a href="../privacy.html" style="color:var(--muted);">Privasi</a></span>
    </div>
  </footer>
</body>
</html>
`;
}

function main() {
  const directory = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let content = {};
  try {
    content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  } catch {
    // content.json opsional untuk kompatibilitas.
  }
  SITE_URL = (
    process.env.SITE_URL ||
    process.env.URL ||
    content.site?.url ||
    'https://miazakii.github.io/design-directory-surabaya'
  ).replace(/\/$/, '');
  SITE_NAME = String(content.site?.name || 'Design Directory Surabaya').trim();
  const studios = Array.isArray(directory.studios) ? directory.studios : [];
  const lastmod = String(directory.generatedAt || new Date().toISOString()).slice(0, 10);

  fs.rmSync(STUDIOS_DIR, { recursive: true, force: true });
  fs.mkdirSync(STUDIOS_DIR, { recursive: true });

  for (const studio of studios) {
    if (!studio.id || !studio.name) continue;
    const filePath = path.join(STUDIOS_DIR, `${safeFileId(studio.id)}.html`);
    fs.writeFileSync(filePath, studioPage(studio, directory), 'utf8');
  }

  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/map.html`,
    `${SITE_URL}/privacy.html`,
    ...studios
      .filter((studio) => studio.id && studio.name)
      .map((studio) => studioUrl(studio.id)),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${esc(url)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(
    path.join(OUT_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  );

  console.log(`SEO: ${studios.length} halaman studio, sitemap, dan robots.txt -> ${path.relative(ROOT, OUT_DIR)}/`);
}

main();
