export function setByPath(object, path, value) {
  const keys = String(path).split('.').filter(Boolean);
  if (!keys.length) return value;
  const clone = Array.isArray(object) ? [...object] : { ...object };
  let cursor = clone;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const current = cursor[key];
    cursor[key] = Array.isArray(current) ? [...current] : { ...(current || {}) };
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

export function getByPath(object, path) {
  return String(path)
    .split('.')
    .filter(Boolean)
    .reduce((value, key) => value?.[key], object);
}
