import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'site', 'vendor', 'maplibre');

const mjsPath = require.resolve('maplibre-gl/dist/maplibre-gl.mjs');
const workerPath = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
const cssPath = require.resolve('maplibre-gl/dist/maplibre-gl.css');
const licensePath = path.join(path.dirname(require.resolve('maplibre-gl/package.json')), 'LICENSE.txt');

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.copyFileSync(mjsPath, path.join(OUT_DIR, 'maplibre-gl.mjs'));
fs.copyFileSync(workerPath, path.join(OUT_DIR, 'maplibre-gl-worker.mjs'));
fs.copyFileSync(cssPath, path.join(OUT_DIR, 'maplibre-gl.css'));
fs.copyFileSync(licensePath, path.join(OUT_DIR, 'LICENSE.txt'));

const version = JSON.parse(fs.readFileSync(require.resolve('maplibre-gl/package.json'), 'utf8')).version;
fs.writeFileSync(
  path.join(OUT_DIR, 'VERSION.txt'),
  `maplibre-gl ${version}\nDisalin dari node_modules oleh npm run vendor:sync.\n`,
  'utf8',
);

console.log(`Vendor MapLibre ${version} -> site/vendor/maplibre/`);
