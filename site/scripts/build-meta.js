import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../../src/validate-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_FILE = path.join(ROOT, 'site', 'data', 'content.json');
const OUT_DIR = path.resolve(ROOT, process.env.SITE_OUT_DIR || 'dist');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function absoluteUrl(value, base) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `${String(base || '').replace(/\/$/, '')}/${text.replace(/^\//, '')}`;
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
}

function replaceMeta(html, attribute, key, value) {
  if (!value) return html;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${esc(value)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function replaceCanonical(html, url) {
  if (!url) return html;
  const pattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  const tag = `<link rel="canonical" href="${esc(url)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function patchPage(file, meta, site) {
  const filePath = path.join(OUT_DIR, file);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const image = absoluteUrl(meta.ogImage || 'og-image.png', site.url);
  const canonical = meta.canonical || site.url;

  html = replaceTitle(html, meta.title);
  html = replaceMeta(html, 'name', 'description', meta.description);
  html = replaceMeta(html, 'property', 'og:title', meta.title);
  html = replaceMeta(html, 'property', 'og:description', meta.description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'property', 'og:image', image);
  html = replaceMeta(html, 'name', 'twitter:title', meta.title);
  html = replaceMeta(html, 'name', 'twitter:description', meta.description);
  html = replaceMeta(html, 'name', 'twitter:image', image);
  html = replaceCanonical(html, canonical);

  if (file === 'index.html') {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
      description: site.description,
      inLanguage: 'id',
    };
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

function main() {
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  const errors = validateContent(content);
  if (errors.length) {
    throw new Error(`content.json tidak valid:\n- ${errors.slice(0, 10).join('\n- ')}`);
  }
  const pages = [
    ['index.html', content.seo?.home],
    ['map.html', content.seo?.map],
    ['privacy.html', content.seo?.privacy],
  ];

  for (const [file, meta] of pages) {
    if (meta) patchPage(file, meta, content.site || {});
  }

  console.log(`Meta: title/description/OG diperbarui untuk ${pages.length} halaman -> ${path.relative(ROOT, OUT_DIR)}/`);
}

main();
