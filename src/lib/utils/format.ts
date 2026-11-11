/** Formatting helpers. Pure functions — covered by unit tests. */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** 1536 -> "1.5 KB". Uses binary units (KiB values, KB labels) like every file manager. */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  const digits = exp === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : fractionDigits;
  return `${value.toFixed(digits).replace(/\.0+$/, '')} ${UNITS[exp]}`;
}

/** Percentage saved by compression, clamped and signed. */
export function savingsPercent(before: number, after: number): number {
  if (!before || before <= 0) return 0;
  return Math.round(((before - after) / before) * 1000) / 10;
}

/** "1h 04m", "3m 12s", "8.4s" */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Extension (lower-case, with leading dot) of a file name. "" when none. */
export function extOf(name: string): string {
  const clean = name.trim();
  const idx = clean.lastIndexOf('.');
  if (idx <= 0 || idx === clean.length - 1) return '';
  return `.${clean.slice(idx + 1).toLowerCase()}`;
}

export function baseName(name: string): string {
  const ext = extOf(name);
  return ext ? name.slice(0, name.length - ext.length) : name;
}

/** `photo.JPG` + `png` -> `photo.png` */
export function withExtension(name: string, ext: string): string {
  const suffix = ext.startsWith('.') ? ext.slice(1) : ext;
  return `${baseName(name)}.${suffix}`;
}

/** Make a name collision-free inside a set, `a.png` -> `a-2.png`. */
export function dedupeName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const ext = extOf(name);
  const base = baseName(name);
  let i = 2;
  while (taken.has(`${base}-${i}${ext}`)) i += 1;
  return `${base}-${i}${ext}`;
}

/** `jpg` -> `JPG`, `mp4` -> `MP4`, but keep mixed-case words readable. */
export function formatLabel(ext: string): string {
  const clean = ext.replace(/^\./, '');
  return /^[a-z0-9]+$/.test(clean) ? clean.toUpperCase() : clean;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Short, deterministic-ish id (no crypto dependency, works in every context). */
let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter}_${rand}`;
}
