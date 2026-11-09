import { normalizePlace, mergePlace } from './normalize.js';
import { nameSimilarity, normalizeName, normalizePhone } from './data-quality.js';

function findRoot(parent, index) {
  let current = index;
  while (parent[current] !== current) {
    parent[current] = parent[parent[current]];
    current = parent[current];
  }
  return current;
}

function union(parent, a, b) {
  const rootA = findRoot(parent, a);
  const rootB = findRoot(parent, b);
  if (rootA !== rootB) parent[rootB] = rootA;
}

function closeCoordinates(a, b, threshold = 0.0006) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return false;
  }
  return (
    Math.abs(Number(a.latitude) - Number(b.latitude)) <= threshold &&
    Math.abs(Number(a.longitude) - Number(b.longitude)) <= threshold
  );
}

function richness(place) {
  return [
    place.website ? 4 : 0,
    place.phone ? 3 : 0,
    place.address ? 2 : 0,
    place.emails.length,
    place.instagrams.length + place.facebooks.length + place.linkedIns.length,
    Math.min(place.reviewsCount, 100) / 100,
    place.categories.length,
  ].reduce((total, value) => total + value, 0);
}

export function dedupePlaces(rawItems) {
  const items = rawItems.map(normalizePlace).filter((place) => place.name);
  if (items.length < 2) return items;

  const parent = items.map((_, index) => index);
  const byPlaceId = new Map();
  const byNameAddress = new Map();
  const byPhone = new Map();

  items.forEach((place, index) => {
    if (place.placeId) {
      if (byPlaceId.has(place.placeId)) union(parent, byPlaceId.get(place.placeId), index);
      else byPlaceId.set(place.placeId, index);
    }

    const nameAddress = `${normalizeName(place.name)}|${normalizeName(place.address)}`;
    if (byNameAddress.has(nameAddress)) union(parent, byNameAddress.get(nameAddress), index);
    else byNameAddress.set(nameAddress, index);

    const phone = normalizePhone(place.phone);
    if (phone.length >= 8) {
      if (byPhone.has(phone)) union(parent, byPhone.get(phone), index);
      else byPhone.set(phone, index);
    }
  });

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (
        closeCoordinates(items[i], items[j]) &&
        nameSimilarity(items[i].name, items[j].name) >= 0.8
      ) {
        union(parent, i, j);
      }
    }
  }

  const groups = new Map();
  items.forEach((_, index) => {
    const root = findRoot(parent, index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(index);
  });

  return [...groups.values()].map((indices) => {
    const members = indices
      .map((index) => items[index])
      .sort((a, b) => richness(b) - richness(a));
    return members.slice(1).reduce((base, place) => mergePlace(base, place), members[0]);
  });
}
