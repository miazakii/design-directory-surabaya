import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(PROJECT_ROOT, 'site');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

const STATIC_DIRS = ['css', 'fonts', 'data', 'media'];
const STATIC_FILES = ['favicon.svg', 'og-image.png', 'og-image.svg'];

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveDevAsset(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  for (const dir of STATIC_DIRS) {
    if (!clean.startsWith(`${dir}/`)) continue;
    const file = path.resolve(SITE_DIR, clean);
    if (isInside(path.join(SITE_DIR, dir), file)) return file;
  }
  if (STATIC_FILES.includes(clean)) return path.join(SITE_DIR, clean);
  return null;
}

function serveFile(req, res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

function copyStaticAssets(outDir) {
  for (const dir of STATIC_DIRS) {
    const source = path.join(SITE_DIR, dir);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(outDir, dir), { recursive: true, force: true });
    }
  }
  for (const file of STATIC_FILES) {
    const source = path.join(SITE_DIR, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(outDir, file));
    }
  }
}

/**
 * Menyajikan data/font/CSS lama saat `vite dev`, lalu menyalin aset statis yang
 * sama ke `dist/` saat build. Halaman SEO statis tetap memakai CSS/font tersebut.
 */
function siteAssetsPlugin() {
  return {
    name: 'site-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !['GET', 'HEAD'].includes(req.method || 'GET')) return next();
        const pathname = new URL(req.url, 'http://localhost').pathname;
        const filePath = resolveDevAsset(pathname);
        if (!filePath) return next();
        serveFile(req, res, filePath);
      });
    },
    closeBundle() {
      copyStaticAssets(DIST_DIR);
    },
  };
}

export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: false,
  plugins: [react(), siteAssetsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(PROJECT_ROOT, 'src'),
    },
  },
  build: {
    outDir: DIST_DIR,
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        map: path.resolve(__dirname, 'map.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        privacy: path.resolve(__dirname, 'privacy.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [PROJECT_ROOT],
    },
  },
});
