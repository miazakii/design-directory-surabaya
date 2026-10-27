import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'site');
const DATA_FILE = path.join(SITE_DIR, 'data', 'directory.json');
const PORT = Number(process.env.ADMIN_PORT || process.argv[2] || 8787);

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

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? '/admin.html' : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(SITE_DIR, relative));

  if (!filePath.startsWith(SITE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function saveDirectory(req, res) {
  const body = await readBody(req);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: 'JSON tidak valid.' });
    return;
  }

  try {
    fs.writeFileSync(DATA_FILE, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  } catch (error) {
    sendJson(res, 500, { error: `Gagal menulis file: ${error.message}` });
    return;
  }

  try {
    await execFileAsync('git', ['add', 'site/data/directory.json'], { cwd: ROOT });

    let hasChanges = true;
    try {
      await execFileAsync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT });
      hasChanges = false;
    } catch {
      hasChanges = true;
    }

    if (hasChanges) {
      await execFileAsync('git', ['commit', '-m', 'Update directory data from local admin'], { cwd: ROOT });
      await execFileAsync('git', ['push', 'origin', 'main'], { cwd: ROOT });
    }

    sendJson(res, 200, { ok: true, pushed: hasChanges });
  } catch (error) {
    sendJson(res, 500, { error: `Gagal commit/push: ${error.message}` });
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/api/directory' && req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      sendJson(res, 200, { data });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (pathname === '/api/directory' && req.method === 'POST') {
    await saveDirectory(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Admin lokal berjalan di http://localhost:${PORT}/admin.html`);
  console.log('Simpan perubahan akan otomatis commit & push ke origin main.');
});
