/**
 * Page-range parsing and expansion.
 *
 * Syntax accepted everywhere a `pages` setting is used:
 *   "2"          -> [2]
 *   "1-4"        -> [1,2,3,4]
 *   "1,3,5-7"    -> [1,3,5,6,7]
 *   "3-"         -> [3 .. last]   (when `pageCount` is supplied)
 *   "-2"         -> [1,2]         (when `pageCount` is supplied)
 *
 * Pages are 1-based. Duplicates are removed, order is preserved as written,
 * and out-of-range values are rejected so the caller can show a real error
 * instead of silently producing an empty document.
 */

export interface PageRangeResult {
  ok: true;
  pages: number[];
}
export interface PageRangeError {
  ok: false;
  error: string;
}

export type ParsePageRangeOptions = {
  /** Total pages, enables open-ended ranges ("3-", "-2") and bounds checking. */
  pageCount?: number;
  /** Keep duplicates instead of removing them (default: remove). */
  allowDuplicates?: boolean;
  /** Sort ascending instead of preserving written order (default: preserve). */
  sort?: boolean;
};

export function parsePageRange(
  input: string,
  options: ParsePageRangeOptions = {},
): PageRangeResult | PageRangeError {
  const { pageCount, allowDuplicates = false, sort = false } = options;
  const text = (input ?? '').trim();

  if (!text) return { ok: false, error: 'Enter at least one page number, e.g. "1,3,5-7".' };
  if (!/^[\d\s,\-]+$/.test(text)) {
    return { ok: false, error: 'Only digits, commas and dashes are allowed, e.g. "1,3,5-7".' };
  }

  const pages: number[] = [];
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'Enter at least one page number.' };

  for (const part of parts) {
    if (part.includes('-')) {
      const [rawStart, rawEnd] = part.split('-');
      const openStart = (rawStart ?? '').trim() === '';
      const openEnd = (rawEnd ?? '').trim() === '';

      if (openStart && openEnd) {
        return { ok: false, error: `Invalid range "${part}". Use a number on at least one side.` };
      }
      if ((openStart || openEnd) && !pageCount) {
        return { ok: false, error: `Open-ended range "${part}" needs a known page count.` };
      }

      const start = openStart ? 1 : Number(rawStart);
      const end = openEnd ? (pageCount as number) : Number(rawEnd);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { ok: false, error: `Invalid range "${part}".` };
      }
      if (start < 1) return { ok: false, error: `Page numbers start at 1 (got ${start}).` };
      if (end < start) return { ok: false, error: `Invalid range "${part}": end is before start.` };
      if (pageCount && end > pageCount) {
        return { ok: false, error: `Page ${end} does not exist — the document has ${pageCount} page${pageCount === 1 ? '' : 's'}.` };
      }
      // Guard against "1-1000000" freezing the tab.
      if (end - start > 100_000) return { ok: false, error: `Range "${part}" is too large.` };

      for (let p = start; p <= end; p += 1) pages.push(p);
    } else {
      const n = Number(part);
      if (!Number.isInteger(n)) return { ok: false, error: `Invalid page number "${part}".` };
      if (n < 1) return { ok: false, error: `Page numbers start at 1 (got ${n}).` };
      if (pageCount && n > pageCount) {
        return { ok: false, error: `Page ${n} does not exist — the document has ${pageCount} page${pageCount === 1 ? '' : 's'}.` };
      }
      pages.push(n);
    }
  }

  let result = sort ? [...pages].sort((a, b) => a - b) : pages;
  if (!allowDuplicates) {
    const seen = new Set<number>();
    result = result.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
  }
  if (result.length === 0) return { ok: false, error: 'No pages selected.' };
  return { ok: true, pages: result };
}

/** Split "1-3,5,7-9" into contiguous chunks — used by Split PDF. */
export function splitIntoChunks(pages: number[]): number[][] {
  const sorted = [...pages].sort((a, b) => a - b);
  const chunks: number[][] = [];
  let current: number[] = [];
  for (const p of sorted) {
    if (current.length && p === current[current.length - 1]! + 1) current.push(p);
    else {
      if (current.length) chunks.push(current);
      current = [p];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** Render a page list back to compact human text: [1,2,3,7] -> "1-3, 7". */
export function formatPageList(pages: number[]): string {
  if (!pages.length) return '';
  const chunks = splitIntoChunks(pages);
  return chunks
    .map((c) => (c.length === 1 ? String(c[0]) : `${c[0]}-${c[c.length - 1]}`))
    .join(', ');
}

/** "every N pages" -> [[1..N],[N+1..2N],...] */
export function chunkEveryN(pageCount: number, n: number): number[][] {
  if (!Number.isInteger(n) || n < 1) return [];
  const out: number[][] = [];
  for (let start = 1; start <= pageCount; start += n) {
    const end = Math.min(start + n - 1, pageCount);
    const chunk: number[] = [];
    for (let p = start; p <= end; p += 1) chunk.push(p);
    out.push(chunk);
  }
  return out;
}
