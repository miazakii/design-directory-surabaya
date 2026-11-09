import { config } from './config.js';

function asText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function relevanceOf(place) {
  const name = asText(place.name);
  const primaryCategory = asText(place.categoryName);
  const categories = Array.isArray(place.categories) ? place.categories.map(asText) : [];
  const categoryText = [primaryCategory, ...categories].filter(Boolean).join(' | ');
  const searchable = [name, categoryText].filter(Boolean).join(' | ');

  const strong = config.relevance.strongName.filter((term) => name.includes(term));
  const core = config.relevance.core.filter((term) => searchable.includes(term));
  const nameMismatch = config.relevance.mismatch.filter((term) => name.includes(term));
  const primaryMismatch = config.relevance.mismatch.filter((term) =>
    primaryCategory.includes(term),
  );
  const categoryMismatch = config.relevance.mismatch.filter((term) =>
    categoryText.includes(term),
  );

  let ok = false;
  let reason = 'Tidak ada kata kunci relevan';

  if (nameMismatch.length > 0) {
    reason = 'Nama mengandung istilah yang dikecualikan';
  } else if (strong.length > 0) {
    // Nama yang eksplisit menyebut branding/desain boleh mengalahkan kategori
    // Google yang sering salah.
    ok = true;
    reason = 'Nama cocok kuat';
  } else if (primaryMismatch.length > 0) {
    reason = 'Kategori utama dikecualikan';
  } else if (core.length > 0) {
    ok = true;
    reason = 'Kata inti cocok';
  }

  return {
    ok,
    reason,
    matched: strong.length > 0 ? strong : core,
    excluded: ok ? [] : [...new Set([...nameMismatch, ...primaryMismatch, ...categoryMismatch])],
    strongName: strong,
    categoryMismatch: [...new Set([...primaryMismatch, ...categoryMismatch])],
  };
}
