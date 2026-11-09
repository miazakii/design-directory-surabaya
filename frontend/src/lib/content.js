import fallbackContent from '../../../site/data/content.json';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, overrides) {
  if (Array.isArray(base) || Array.isArray(overrides)) return overrides ?? base;
  if (!isObject(base) || !isObject(overrides)) return overrides ?? base;
  const output = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    output[key] = key in base ? merge(base[key], value) : value;
  }
  return output;
}

export function normalizeContent(content) {
  return merge(fallbackContent, content || {});
}

export async function loadContent(signal) {
  try {
    const response = await fetch('data/content.json', { cache: 'no-cache', signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return normalizeContent(await response.json());
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.warn('Konten tidak dapat dimuat; memakai fallback bawaan.', error);
    return normalizeContent(fallbackContent);
  }
}

export { fallbackContent };
