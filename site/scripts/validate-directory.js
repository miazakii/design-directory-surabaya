import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDirectory } from '../../src/validate-directory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'site', 'data', 'directory.json');

let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error(`Gagal membaca ${path.relative(ROOT, filePath)}: ${error.message}`);
  process.exit(1);
}

const errors = validateDirectory(data);
if (errors.length > 0) {
  console.error(`Data direktori tidak valid (${errors.length} masalah):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `OK: ${data.studios.length} studio, ${data.groups.length} kategori, ${data.notes.length} catatan -> ${path.relative(ROOT, filePath)}`,
);
