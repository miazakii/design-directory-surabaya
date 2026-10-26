export function log(message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] ${message}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function yearsBetween(fromMs, to = new Date()) {
  const toMs = to instanceof Date ? to.getTime() : Number(to);
  return Math.round(((toMs - fromMs) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: size }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        results[index] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export function dedupeStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}
