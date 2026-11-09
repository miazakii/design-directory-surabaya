import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDirectory } from '../../src/validate-directory.js';
import { validateContent } from '../../src/validate-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const directoryPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'site', 'data', 'directory.json');
const contentPath = path.join(ROOT, 'site', 'data', 'content.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Gagal membaca ${path.relative(ROOT, file)}: ${error.message}`);
    process.exit(1);
  }
}

const data = readJson(directoryPath);
const directoryErrors = validateDirectory(data);
if (directoryErrors.length > 0) {
  console.error(`Data direktori tidak valid (${directoryErrors.length} masalah):`);
  for (const error of directoryErrors) console.error(`- ${error}`);
  process.exit(1);
}

if (!process.argv[2]) {
  const content = readJson(contentPath);
  const contentErrors = validateContent(content);
  if (contentErrors.length > 0) {
    console.error(`Konten website tidak valid (${contentErrors.length} masalah):`);
    for (const error of contentErrors) console.error(`- ${error}`);
    process.exit(1);
  }
}

console.log(
  `OK: ${data.studios.length} studio, ${data.groups.length} kategori, ${data.notes.length} catatan -> ${path.relative(ROOT, directoryPath)}`,
);
if (!process.argv[2]) console.log(`OK: konten -> ${path.relative(ROOT, contentPath)}`);
