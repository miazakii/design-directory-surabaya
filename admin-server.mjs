import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateDirectory } from './src/validate-directory.js';
import { validateContent } from './src/validate-content.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'site');
const DIST_DIR = path.join(ROOT, 'dist');
const DATA_DIR = path.join(SITE_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'directory.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const DRAFT_DIR = path.join(ROOT, 'data', 'drafts');
const DRAFT_DIRECTORY_FILE = path.join(DRAFT_DIR, 'directory.json');
const DRAFT_CONTENT_FILE = path.join(DRAFT_DIR, 'content.json');
const MEDIA_DIR = path.join(SITE_DIR, 'media');
const TOKEN_FILE = path.join(ROOT, '.admin-token');
const PORT = Number(process.env.ADMIN_PORT || process.argv[2] || 8787);
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_MEDIA_BODY_BYTES = 8 * 1024 * 1024;
const AUTO_PUSH = process.env.ADMIN_AUTO_PUSH !== 'false';
const GIT_TIMEOUT_MS = 30_000;
const DATA_PATHS = ['site/data/directory.json', 'site/data/content.json'];
const PUBLISH_PATHS = [...DATA_PATHS, 'site/media'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://api.github.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

function loadOrCreateToken() {
  if (process.env.ADMIN_TOKEN) {
    const token = process.env.ADMIN_TOKEN.trim();
    if (token.length < 16) {
      throw new Error('ADMIN_TOKEN terlalu pendek; gunakan minimal 16 karakter.');
    }
    return token;
  }

  try {
    const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (token.length >= 32) {
      fs.chmodSync(TOKEN_FILE, 0o600);
      return token;
    }
  } catch {
    // Token belum ada; dibuat di bawah.
  }

  const token = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(TOKEN_FILE, `${token}\n`, { mode: 0o600 });
  return token;
}

const ADMIN_TOKEN = loadOrCreateToken();

function tokenMatches(value) {
  if (!value) return false;
  const given = Buffer.from(String(value));
  const expected = Buffer.from(ADMIN_TOKEN);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function baseHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  };
}

function sendJson(res, status, payload) {
  res.writeHead(
    status,
    baseHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    }),
  );
  res.end(JSON.stringify(payload));
}

function isAllowedHost(req) {
  const host = String(req.headers.host || '').toLowerCase();
  return host === `127.0.0.1:${PORT}` || host === `localhost:${PORT}`;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === `http://127.0.0.1:${PORT}` || origin === `http://localhost:${PORT}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tempFile = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tempFile, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o644 });
    fs.renameSync(tempFile, file);
  } catch (error) {
    try {
      fs.rmSync(tempFile, { force: true });
    } catch {
      // Abaikan kegagalan pembersihan file sementara.
    }
    throw error;
  }
}

function draftState() {
  return {
    directory: fs.existsSync(DRAFT_DIRECTORY_FILE),
    content: fs.existsSync(DRAFT_CONTENT_FILE),
  };
}

function loadBundle() {
  const drafts = draftState();
  return {
    directory: readJson(drafts.directory ? DRAFT_DIRECTORY_FILE : DATA_FILE),
    content: readJson(drafts.content ? DRAFT_CONTENT_FILE : CONTENT_FILE),
    drafts,
  };
}

function validateBundle(directory, content) {
  const directoryErrors = validateDirectory(directory);
  const contentErrors = validateContent(content);
  return [
    ...directoryErrors.map((error) => `Data: ${error}`),
    ...contentErrors.map((error) => `Konten: ${error}`),
  ];
}

function copyBundleToDist(directory, content) {
  if (!fs.existsSync(DIST_DIR)) return;
  writeJsonAtomic(path.join(DIST_DIR, 'data', 'directory.json'), directory);
  writeJsonAtomic(path.join(DIST_DIR, 'data', 'content.json'), content);
  if (fs.existsSync(MEDIA_DIR)) {
    fs.cpSync(MEDIA_DIR, path.join(DIST_DIR, 'media'), { recursive: true, force: true });
  }
}

function removeDrafts() {
  for (const file of [DRAFT_DIRECTORY_FILE, DRAFT_CONTENT_FILE]) {
    fs.rmSync(file, { force: true });
  }
}

function resolveStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decoded.startsWith('/media/')) {
    const filePath = path.resolve(MEDIA_DIR, decoded.slice('/media/'.length));
    const relative = path.relative(MEDIA_DIR, filePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return filePath;
  }

  const relative = decoded === '/' ? 'admin.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(DIST_DIR, relative);
  const relativeToDist = path.relative(DIST_DIR, filePath);

  if (!relativeToDist || relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
    return null;
  }
  return filePath;
}

function serveStatic(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    res.writeHead(403, baseHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, baseHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isAdminPage = pathname === '/' || pathname === '/admin.html';
    const headers = baseHeaders({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'no-cache',
    });

    if (isAdminPage) {
      headers['Content-Security-Policy'] = ADMIN_CSP;
      headers['X-Frame-Options'] = 'DENY';
    }

    res.writeHead(200, headers);
    res.end(data);
  });
}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error(`Body terlalu besar (maksimal ${maxBytes} byte).`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function readJsonBody(req, maxBytes) {
  const body = await readBody(req, maxBytes);
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('JSON tidak valid.');
    error.statusCode = 400;
    throw error;
  }
}

async function git(args) {
  return execFileAsync('git', args, {
    cwd: ROOT,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function repoStatus() {
  const drafts = draftState();
  let branch = 'main';
  let dirty = false;
  let lastCommit = null;
  let ahead = 0;
  let behind = 0;

  try {
    branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim() || 'main';
  } catch {
    // Biarkan default.
  }
  try {
    dirty = Boolean((await git(['status', '--porcelain', '--', ...PUBLISH_PATHS])).stdout.trim());
  } catch {
    // Biarkan default.
  }
  try {
    const raw = (await git(['log', '-1', '--pretty=format:%h%x1f%aI%x1f%an%x1f%s', '--', ...PUBLISH_PATHS])).stdout.trim();
    if (raw) {
      const [hash, date, author, subject] = raw.split('\x1f');
      lastCommit = { hash, date, author, subject };
    }
  } catch {
    // Biarkan default.
  }
  try {
    const raw = (await git(['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`])).stdout.trim();
    const [behindRaw, aheadRaw] = raw.split(/\s+/).map(Number);
    behind = Number.isFinite(behindRaw) ? behindRaw : 0;
    ahead = Number.isFinite(aheadRaw) ? aheadRaw : 0;
  } catch {
    // Origin belum ada; abaikan.
  }

  return { branch, dirty, drafts, lastCommit, ahead, behind };
}

async function history() {
  const raw = (await git(['log', '-n', '30', '--pretty=format:%h%x1f%aI%x1f%an%x1f%s', '--', ...PUBLISH_PATHS]))
    .stdout.trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const [hash, date, author, subject] = line.split('\x1f');
    return { hash, date, author, subject };
  });
}

async function snapshot(sha) {
  if (!/^[0-9a-f]{7,40}$/i.test(String(sha || ''))) {
    const error = new Error('Hash commit tidak valid.');
    error.statusCode = 400;
    throw error;
  }
  const directoryRaw = (await git(['show', `${sha}:site/data/directory.json`])).stdout;
  let contentRaw = null;
  try {
    contentRaw = (await git(['show', `${sha}:site/data/content.json`])).stdout;
  } catch {
    // Versi lama belum punya content.json.
  }
  return {
    directory: JSON.parse(directoryRaw),
    content: contentRaw ? JSON.parse(contentRaw) : null,
  };
}

async function saveDraft(req, res) {
  const body = await readJsonBody(req);
  const directory = body.directory;
  const content = body.content;
  const errors = validateBundle(directory, content);
  if (errors.length) {
    sendJson(res, 400, { error: 'Draft tidak valid.', details: errors.slice(0, 20) });
    return;
  }
  writeJsonAtomic(DRAFT_DIRECTORY_FILE, directory);
  writeJsonAtomic(DRAFT_CONTENT_FILE, content);
  sendJson(res, 200, { ok: true, drafts: { directory: true, content: true } });
}

async function discardDraft(req, res) {
  removeDrafts();
  const { directory, content } = loadBundle();
  copyBundleToDist(directory, content);
  sendJson(res, 200, { ok: true, drafts: { directory: false, content: false } });
}

async function previewDraft(req, res) {
  const body = await readJsonBody(req);
  const directory = body.directory;
  const content = body.content;
  const errors = validateBundle(directory, content);
  if (errors.length) {
    sendJson(res, 400, { error: 'Preview tidak valid.', details: errors.slice(0, 20) });
    return;
  }
  writeJsonAtomic(DRAFT_DIRECTORY_FILE, directory);
  writeJsonAtomic(DRAFT_CONTENT_FILE, content);
  copyBundleToDist(directory, content);
  sendJson(res, 200, { ok: true, url: '/index.html' });
}

async function publishBundle(req, res) {
  const body = await readJsonBody(req);
  const directory = body.directory;
  const content = body.content;
  const errors = validateBundle(directory, content);
  if (errors.length) {
    sendJson(res, 400, { error: 'Data tidak valid.', details: errors.slice(0, 20) });
    return;
  }

  writeJsonAtomic(DATA_FILE, directory);
  writeJsonAtomic(CONTENT_FILE, content);
  removeDrafts();
  copyBundleToDist(directory, content);

  let committed = false;
  try {
    await git(['add', '--', ...PUBLISH_PATHS]);
    let hasChanges = true;
    try {
      await git(['diff', '--cached', '--quiet', '--', ...PUBLISH_PATHS]);
      hasChanges = false;
    } catch {
      hasChanges = true;
    }

    if (hasChanges) {
      const message = String(body.message || '').trim().slice(0, 120) || 'Publish dashboard updates';
      await git(['commit', '-m', message, '--only', '--', ...PUBLISH_PATHS]);
      committed = true;
    }
  } catch (error) {
    sendJson(res, 500, {
      error: `Data tersimpan, tetapi commit gagal: ${error.message}`,
      committed: false,
      pushed: false,
    });
    return;
  }

  let pushed = false;
  if (committed && AUTO_PUSH) {
    try {
      await git(['push', 'origin', 'main']);
      pushed = true;
    } catch (error) {
      sendJson(res, 500, {
        error: `Data sudah di-commit lokal, tetapi push gagal: ${error.message}`,
        committed: true,
        pushed: false,
      });
      return;
    }
  }

  sendJson(res, 200, {
    ok: true,
    committed,
    pushed,
    autoPush: AUTO_PUSH,
    drafts: { directory: false, content: false },
  });
}

async function publishDirectory(req, res) {
  // Kompatibilitas endpoint lama: hanya mengganti directory, konten tetap.
  const body = await readJsonBody(req);
  const content = readJson(CONTENT_FILE);
  const errors = validateBundle(body, content);
  if (errors.length) {
    sendJson(res, 400, { error: 'Data direktori tidak valid.', details: errors.slice(0, 20) });
    return;
  }
  const directory = body;
  writeJsonAtomic(DATA_FILE, directory);
  removeDrafts();
  copyBundleToDist(directory, content);
  await git(['add', '--', ...PUBLISH_PATHS]);
  let hasChanges = true;
  try {
    await git(['diff', '--cached', '--quiet', '--', ...PUBLISH_PATHS]);
    hasChanges = false;
  } catch {
    hasChanges = true;
  }
  let committed = false;
  if (hasChanges) {
    await git(['commit', '-m', 'Update directory data from local admin', '--only', '--', ...PUBLISH_PATHS]);
    committed = true;
  }
  let pushed = false;
  if (committed && AUTO_PUSH) {
    await git(['push', 'origin', 'main']);
    pushed = true;
  }
  sendJson(res, 200, { ok: true, committed, pushed, autoPush: AUTO_PUSH });
}

function listMedia() {
  if (!fs.existsSync(MEDIA_DIR)) return [];
  return fs
    .readdirSync(MEDIA_DIR)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .map((file) => ({
      name: file,
      url: `media/${file}`,
      size: fs.statSync(path.join(MEDIA_DIR, file)).size,
    }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

async function uploadMedia(req, res) {
  const body = await readJsonBody(req, MAX_MEDIA_BODY_BYTES);
  const match = String(body.dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    sendJson(res, 400, { error: 'Format gambar harus PNG, JPEG, atau WebP.' });
    return;
  }
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    sendJson(res, 413, { error: 'Ukuran gambar maksimal 5 MB.' });
    return;
  }
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const base = String(body.filename || 'gambar')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'gambar';
  const name = `${Date.now()}-${base}.${ext}`;
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.writeFileSync(path.join(MEDIA_DIR, name), buffer, { mode: 0o644 });
  sendJson(res, 200, { ok: true, url: `media/${name}`, name, size: buffer.length });
}


async function deleteMedia(req, res) {
  const body = await readJsonBody(req);
  const name = String(body.name || '');
  if (!/^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/i.test(name)) {
    sendJson(res, 400, { error: 'Nama media tidak valid.' });
    return;
  }
  fs.rmSync(path.join(MEDIA_DIR, name), { force: true });
  sendJson(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname;

  if (!isAllowedHost(req)) {
    res.writeHead(421, baseHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Misdirected Request');
    return;
  }

  if (pathname.startsWith('/api/')) {
    if (!tokenMatches(req.headers['x-admin-token'])) {
      sendJson(res, 401, { error: 'Token admin tidak valid atau belum diisi.' });
      return;
    }
    if (!['GET', 'HEAD', 'POST'].includes(req.method || '')) {
      res.writeHead(405, baseHeaders({ Allow: 'GET, HEAD, POST' }));
      res.end();
      return;
    }
    if (req.method === 'POST' && !isAllowedOrigin(req)) {
      sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
      return;
    }

    try {
      if (pathname === '/api/bundle' && req.method === 'GET') {
        const bundle = loadBundle();
        sendJson(res, 200, { ...bundle, status: await repoStatus() });
        return;
      }

      if (pathname === '/api/content' && req.method === 'GET') {
        sendJson(res, 200, { data: readJson(CONTENT_FILE) });
        return;
      }

      if (pathname === '/api/directory' && req.method === 'GET') {
        sendJson(res, 200, { data: readJson(DATA_FILE) });
        return;
      }

      if (pathname === '/api/draft' && req.method === 'POST') {
        await saveDraft(req, res);
        return;
      }

      if (pathname === '/api/draft/discard' && req.method === 'POST') {
        await discardDraft(req, res);
        return;
      }

      if (pathname === '/api/preview' && req.method === 'POST') {
        await previewDraft(req, res);
        return;
      }

      if (pathname === '/api/publish' && req.method === 'POST') {
        await publishBundle(req, res);
        return;
      }

      if (pathname === '/api/directory' && req.method === 'POST') {
        await publishDirectory(req, res);
        return;
      }

      if (pathname === '/api/status' && req.method === 'GET') {
        sendJson(res, 200, { status: await repoStatus() });
        return;
      }

      if (pathname === '/api/history' && req.method === 'GET') {
        sendJson(res, 200, { commits: await history() });
        return;
      }

      if (pathname.startsWith('/api/history/') && req.method === 'GET') {
        const sha = pathname.slice('/api/history/'.length);
        sendJson(res, 200, await snapshot(sha));
        return;
      }

      if (pathname === '/api/media' && req.method === 'GET') {
        sendJson(res, 200, { files: listMedia() });
        return;
      }

      if (pathname === '/api/media' && req.method === 'POST') {
        await uploadMedia(req, res);
        return;
      }

      if (pathname === '/api/media/delete' && req.method === 'POST') {
        await deleteMedia(req, res);
        return;
      }

      sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405, baseHeaders());
  res.end();
});

if (!fs.existsSync(path.join(DIST_DIR, 'admin.html'))) {
  console.error('dist/admin.html belum ada. Jalankan `npm run build:web` lebih dulu.');
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`Admin lokal berjalan di http://${HOST}:${PORT}/admin.html`);
  console.log(`Buka URL dengan token ini: http://${HOST}:${PORT}/admin.html#t=${ADMIN_TOKEN}`);
  console.log(`Token disimpan di ${TOKEN_FILE} (mode 0600).`);
  console.log(
    `Publish akan commit site/data/directory.json + site/data/content.json; push ${AUTO_PUSH ? 'aktif' : 'nonaktif'} (ADMIN_AUTO_PUSH).`,
  );
});
