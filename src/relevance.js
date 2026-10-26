import { config } from './config.js';

export function relevanceOf(place) {
  const name = place.name.toLowerCase();
  const primary = [name, place.categoryName.toLowerCase()].join(' | ');

  const strong = config.relevance.strongName.filter((term) => name.includes(term));
  const core = config.relevance.core.filter((term) => primary.includes(term));
  const mismatch = config.relevance.mismatch.filter((term) => primary.includes(term));

  return {
    ok: mismatch.length === 0 && (strong.length > 0 || core.length > 0),
    matched: strong.length > 0 ? strong : core,
    excluded: mismatch,
  };
}
