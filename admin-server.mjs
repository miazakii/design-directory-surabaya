import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateDirectory } from './src/validate-directory.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'site');
const DATA_FILE = path.join(SITE_DIR, 'data', 'directory.json');
const TOKEN_FILE = path.join(ROOT, '.admin-token');
const PORT = Number(process.env.ADMIN_PORT || process.argv[2] || 8787);
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const AUTO_PUSH = process.env.ADMIN_AUTO_PUSH !== 'false';
const GIT_TIMEOUT_MS = 30_000;

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
};

const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
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

function resolveStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relative = decoded === '/' ? 'admin.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(SITE_DIR, relative);
  const relativeToSite = path.relative(SITE_DIR, filePath);

  if (!relativeToSite || relativeToSite.startsWith('..') || path.isAbsolute(relativeToSite)) {
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error(`Body terlalu besar (maksimal ${MAX_BODY_BYTES} byte).`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function git(args) {
  return execFileAsync('git', args, {
    cwd: ROOT,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
  });
}

async function saveDirectory(req, res) {
  if (!isAllowedOrigin(req)) {
    sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendJson(res, error.statusCode ?? 400, { error: error.message });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: 'JSON tidak valid.' });
    return;
  }

  const errors = validateDirectory(parsed);
  if (errors.length > 0) {
    sendJson(res, 400, {
      error: 'Data direktori tidak valid.',
      details: errors.slice(0, 20),
    });
    return;
  }

  const tempFile = `${DATA_FILE}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(tempFile, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o644 });
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    try {
      fs.rmSync(tempFile, { force: true });
    } catch {
      // Abaikan kegagalan pembersihan file sementara.
    }
    sendJson(res, 500, { error: `Gagal menulis file: ${error.message}` });
    return;
  }

  let committed = false;
  try {
    await git(['add', '--', 'site/data/directory.json']);

    let hasChanges = true;
    try {
      await git(['diff', '--cached', '--quiet', '--', 'site/data/directory.json']);
      hasChanges = false;
    } catch {
      hasChanges = true;
    }

    if (hasChanges) {
      // --only memastikan commit tidak membawa file lain yang sudah ter-stage.
      await git([
        'commit',
        '-m',
        'Update directory data from local admin',
        '--only',
        '--',
        'site/data/directory.json',
      ]);
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
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname;

  if (!isAllowedHost(req)) {
    res.writeHead(421, baseHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Misdirected Request');
    return;
  }

  if (pathname === '/api/directory') {
    if (!tokenMatches(req.headers['x-admin-token'])) {
      sendJson(res, 401, { error: 'Token admin tidak valid atau belum diisi.' });
      return;
    }

    if (req.method === 'GET') {
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        sendJson(res, 200, { data });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST') {
      await saveDirectory(req, res);
      return;
    }

    res.writeHead(405, baseHeaders({ Allow: 'GET, POST' }));
    res.end();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405, baseHeaders());
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`Admin lokal berjalan di http://${HOST}:${PORT}/admin.html`);
  console.log(`Buka URL dengan token ini: http://${HOST}:${PORT}/admin.html#t=${ADMIN_TOKEN}`);
  console.log(`Token disimpan di ${TOKEN_FILE} (mode 0600).`);
  console.log(
    `Simpan perubahan akan commit hanya site/data/directory.json; push ${AUTO_PUSH ? 'aktif' : 'nonaktif'} (ADMIN_AUTO_PUSH).`,
  );
});
