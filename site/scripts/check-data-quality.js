import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPossibleDuplicates, isSurabayaCity } from '../../src/data-quality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'site', 'data', 'directory.json');
const strict = process.argv.includes('--strict');

let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error(`Gagal membaca ${path.relative(ROOT, filePath)}: ${error.message}`);
  process.exit(1);
}

const studios = Array.isArray(data.studios) ? data.studios : [];
const duplicates = findPossibleDuplicates(studios);
const outside = studios.filter(
  (studio) => studio.city && !isSurabayaCity(studio.city) && !studio.outsideSurabaya,
);
const noContact = studios.filter(
  (studio) =>
    !studio.phone &&
    !studio.website &&
    !(studio.emails ?? []).length &&
    !studio.instagram &&
    !studio.facebook &&
    !studio.linkedin,
);
const noCoordinates = studios.filter(
  (studio) => studio.latitude == null || studio.longitude == null,
);
const needsReview = studios.filter((studio) => studio.needsReview);

console.log(`Data: ${path.relative(ROOT, filePath)}`);
console.log(`Studio: ${studios.length}`);
console.log(`Kemungkinan duplikat: ${duplicates.length} kelompok`);
for (const group of duplicates) {
  console.log(`- ${group.names.join(' & ')} [${group.reasons.join(', ')}]`);
}
console.log(`Kota di luar Surabaya (belum ditandai): ${outside.length}`);
for (const studio of outside.slice(0, 10)) {
  console.log(`- ${studio.name} (${studio.city})`);
}
console.log(`Tanpa kontak digital: ${noContact.length}`);
console.log(`Tanpa koordinat: ${noCoordinates.length}`);
console.log(`Perlu cek manual: ${needsReview.length}`);

if (strict && (duplicates.length > 0 || outside.length > 0)) {
  process.exit(1);
}
