import { AGE_STATUS } from './age.js';

const AGE_CODES = new Set([
  '',
  AGE_STATUS.VERIFIED,
  AGE_STATUS.MANUAL,
  AGE_STATUS.UNKNOWN,
  AGE_STATUS.YOUNG,
]);

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function validateDirectory(data) {
  const errors = [];

  if (!isPlainObject(data)) return ['Root harus berupa objek JSON.'];

  if (typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('title harus berupa teks.');
  }

  if (data.minYears != null && (!Number.isFinite(Number(data.minYears)) || Number(data.minYears) <= 0)) {
    errors.push('minYears harus berupa angka positif.');
  }

  if (
    data.schemaVersion != null &&
    (!Number.isInteger(Number(data.schemaVersion)) || Number(data.schemaVersion) < 1)
  ) {
    errors.push('schemaVersion harus bilangan bulat positif.');
  }

  if (!Array.isArray(data.groups)) {
    errors.push('groups harus berupa array.');
  } else {
    const groupKeys = new Set();
    data.groups.forEach((group, index) => {
      if (!isPlainObject(group)) {
        errors.push(`groups[${index}] harus berupa objek.`);
        return;
      }
      if (typeof group.key !== 'string' || !group.key.trim()) {
        errors.push(`groups[${index}].key wajib diisi.`);
      } else if (groupKeys.has(group.key)) {
        errors.push(`groups[${index}].key duplikat: ${group.key}.`);
      } else {
        groupKeys.add(group.key);
      }
      if (typeof group.label !== 'string' || !group.label.trim()) {
        errors.push(`groups[${index}].label wajib diisi.`);
      }
      if (!isHexColor(group.color)) {
        errors.push(`groups[${index}].color harus format #RRGGBB.`);
      }
    });
  }

  if (!Array.isArray(data.notes)) {
    errors.push('notes harus berupa array.');
  } else {
    data.notes.forEach((note, index) => {
      if (typeof note !== 'string') errors.push(`notes[${index}] harus berupa teks.`);
    });
  }

  if (!Array.isArray(data.studios)) {
    errors.push('studios harus berupa array.');
  } else {
    if (data.studios.length > 5000) errors.push('studios melebihi batas 5000 baris.');

    const studioIds = new Set();
    data.studios.forEach((studio, index) => {
      if (!isPlainObject(studio)) {
        errors.push(`studios[${index}] harus berupa objek.`);
        return;
      }
      if (typeof studio.id !== 'string' || !studio.id.trim()) {
        errors.push(`studios[${index}].id wajib diisi.`);
      } else if (studioIds.has(studio.id)) {
        errors.push(`studios[${index}].id duplikat: ${studio.id}.`);
      } else {
        studioIds.add(studio.id);
      }
      if (typeof studio.name !== 'string' || !studio.name.trim()) {
        errors.push(`studios[${index}].name wajib diisi.`);
      }
      if (typeof studio.group !== 'string' || !studio.group.trim()) {
        errors.push(`studios[${index}].group wajib diisi.`);
      }
      if (studio.ageStatusCode != null && !AGE_CODES.has(studio.ageStatusCode)) {
        errors.push(`studios[${index}].ageStatusCode tidak dikenal: ${studio.ageStatusCode}.`);
      }
      if (studio.emails != null && !Array.isArray(studio.emails)) {
        errors.push(`studios[${index}].emails harus berupa array.`);
      }
      if (studio.openingHours != null && !Array.isArray(studio.openingHours)) {
        errors.push(`studios[${index}].openingHours harus berupa array.`);
      }
      if (studio.rating != null) {
        const rating = Number(studio.rating);
        if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
          errors.push(`studios[${index}].rating harus 0–5.`);
        }
      }
      for (const [key, min, max] of [
        ['latitude', -90, 90],
        ['longitude', -180, 180],
      ]) {
        if (studio[key] == null) continue;
        const value = Number(studio[key]);
        if (!Number.isFinite(value) || value < min || value > max) {
          errors.push(`studios[${index}].${key} harus ${min}–${max}.`);
        }
      }
    });
  }

  return errors;
}
