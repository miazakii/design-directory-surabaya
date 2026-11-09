import { config } from './config.js';
import { yearsBetween } from './utils.js';

// Kode status stabil untuk logika; label manusia dibuat dinamis dari MIN_YEARS.
export const AGE_STATUS = {
  VERIFIED: 'verified',
  MANUAL: 'manual',
  UNKNOWN: 'unknown',
  YOUNG: 'young',
};

export const AGE_ORDER = [
  AGE_STATUS.VERIFIED,
  AGE_STATUS.MANUAL,
  AGE_STATUS.UNKNOWN,
  AGE_STATUS.YOUNG,
];

const YOUTH_PROOF_TYPES = new Set(['wayback', 'domain']);

export function ageStatusLabel(status, minYears = config.minYearsOperating) {
  switch (status) {
    case AGE_STATUS.VERIFIED:
      return `Usia terverifikasi (>= ${minYears} tahun)`;
    case AGE_STATUS.YOUNG:
      return `Kemungkinan < ${minYears} tahun`;
    case AGE_STATUS.MANUAL:
      return 'Perlu cek manual';
    case AGE_STATUS.UNKNOWN:
      return 'Tidak dapat dipastikan';
    default:
      return '';
  }
}

export function ageStatusFromLabel(label) {
  const text = String(label ?? '').trim();
  if (!text) return null;
  if (text.startsWith('Usia terverifikasi')) return AGE_STATUS.VERIFIED;
  if (text.startsWith('Kemungkinan <')) return AGE_STATUS.YOUNG;
  if (text === 'Perlu cek manual') return AGE_STATUS.MANUAL;
  if (text === 'Tidak dapat dipastikan') return AGE_STATUS.UNKNOWN;
  return null;
}

export function cutoffDate(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - config.minYearsOperating);
  return cutoff;
}

export function classifyAge(signals, now = new Date()) {
  const cutoff = cutoffDate(now);
  const cutoffMs = cutoff.getTime();

  const dated = signals
    .filter((signal) => signal?.date)
    .map((signal) => ({ ...signal, time: Date.parse(signal.date) }))
    .filter((signal) => Number.isFinite(signal.time))
    .sort((a, b) => a.time - b.time);

  const earliest = dated[0] ?? null;
  const confirming = dated.filter((signal) => signal.time <= cutoffMs);
  const confidence = Math.min(
    100,
    confirming.reduce((total, signal) => total + (signal.weight ?? 0), 0),
  );
  const hasYouthProof = dated.length >= 2 && dated.some((signal) => YOUTH_PROOF_TYPES.has(signal.type));

  let status = AGE_STATUS.UNKNOWN;
  if (confirming.length > 0) status = AGE_STATUS.VERIFIED;
  else if (hasYouthProof) status = AGE_STATUS.YOUNG;
  else if (dated.length > 0) status = AGE_STATUS.MANUAL;

  return {
    status,
    statusLabel: ageStatusLabel(status),
    confidence,
    cutoffMs,
    cutoff,
    earliest,
    ageYears: earliest ? yearsBetween(earliest.time, now) : null,
    foundedYear: earliest ? new Date(earliest.time).getUTCFullYear() : null,
    signals: dated,
  };
}
