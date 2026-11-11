/**
 * File inspection + validation.
 *
 * We never trust the file extension or `File.type` on its own: browsers guess
 * both from the OS, and users rename files constantly. Every check below reads
 * the first bytes of the file and compares them against a real magic-number
 * signature, so a `.jpg` that is actually a PDF fails with an understandable
 * message instead of producing a corrupt output.
 */

import { extOf } from './format';

export type FileFamily =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'gif'
  | 'bmp'
  | 'avif'
  | 'svg'
  | 'ico'
  | 'tiff'
  | 'heic'
  | 'pdf'
  | 'zip'
  | 'mp4'
  | 'mov'
  | 'webm'
  | 'avi'
  | 'mkv'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'flac'
  | 'm4a'
  | 'aac'
  | 'unknown';

export interface SniffResult {
  family: FileFamily;
  /** Extensions consistent with the detected content. */
  extensions: string[];
  /** Best-guess MIME type derived from content, not from the OS. */
  mime: string;
  confidence: 'exact' | 'probable' | 'none';
}

const FAMILY_META: Record<Exclude<FileFamily, 'unknown'>, { extensions: string[]; mime: string }> = {
  jpeg: { extensions: ['.jpg', '.jpeg', '.jpe', '.jfif'], mime: 'image/jpeg' },
  png: { extensions: ['.png'], mime: 'image/png' },
  webp: { extensions: ['.webp'], mime: 'image/webp' },
  gif: { extensions: ['.gif'], mime: 'image/gif' },
  bmp: { extensions: ['.bmp', '.dib'], mime: 'image/bmp' },
  avif: { extensions: ['.avif'], mime: 'image/avif' },
  svg: { extensions: ['.svg'], mime: 'image/svg+xml' },
  ico: { extensions: ['.ico'], mime: 'image/x-icon' },
  tiff: { extensions: ['.tif', '.tiff'], mime: 'image/tiff' },
  heic: { extensions: ['.heic', '.heif'], mime: 'image/heic' },
  pdf: { extensions: ['.pdf'], mime: 'application/pdf' },
  zip: { extensions: ['.zip', '.docx', '.xlsx', '.pptx', '.epub'], mime: 'application/zip' },
  mp4: { extensions: ['.mp4', '.m4v'], mime: 'video/mp4' },
  mov: { extensions: ['.mov', '.qt'], mime: 'video/quicktime' },
  webm: { extensions: ['.webm'], mime: 'video/webm' },
  avi: { extensions: ['.avi'], mime: 'video/x-msvideo' },
  mkv: { extensions: ['.mkv'], mime: 'video/x-matroska' },
  mp3: { extensions: ['.mp3'], mime: 'audio/mpeg' },
  wav: { extensions: ['.wav', '.wave'], mime: 'audio/wav' },
  ogg: { extensions: ['.ogg', '.oga', '.opus'], mime: 'audio/ogg' },
  flac: { extensions: ['.flac'], mime: 'audio/flac' },
  m4a: { extensions: ['.m4a'], mime: 'audio/mp4' },
  aac: { extensions: ['.aac'], mime: 'audio/aac' },
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  for (let i = start; i < start + length && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]!);
  return out;
}

function startsWith(bytes: Uint8Array, seq: number[]): boolean {
  return seq.every((b, i) => bytes[i] === b);
}

/** Detect the real content type from the first bytes of a file. */
export function sniffBytes(bytes: Uint8Array): SniffResult {
  const none: SniffResult = { family: 'unknown', extensions: [], mime: 'application/octet-stream', confidence: 'none' };
  if (bytes.length < 4) return none;

  const found = (family: Exclude<FileFamily, 'unknown'>, confidence: 'exact' | 'probable' = 'exact'): SniffResult => ({
    family,
    extensions: FAMILY_META[family].extensions,
    mime: FAMILY_META[family].mime,
    confidence,
  });

  // Images
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return found('jpeg');
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return found('png');
  if (ascii(bytes, 0, 3) === 'GIF') return found('gif');
  if (ascii(bytes, 0, 2) === 'BM') return found('bmp');
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return found('webp');
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return found('wav');
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'AVI ') return found('avi');
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00]) || startsWith(bytes, [0x00, 0x00, 0x02, 0x00])) return found('ico', 'probable');
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return found('tiff');
  if (startsWith(bytes, [0x4f, 0x47, 0x47, 0x53])) return found('ogg');
  if (ascii(bytes, 0, 4) === 'fLaC') return found('flac');

  // PDF (allow a few bytes of leading garbage, which real-world files have)
  const head = ascii(bytes, 0, Math.min(1024, bytes.length));
  if (head.includes('%PDF-')) return found('pdf');

  // ISO-BMFF family: MP4 / MOV / M4A / AVIF / HEIC
  if (ascii(bytes, 4, 4) === 'ftyp' && bytes.length >= 12) {
    const brand = ascii(bytes, 8, 4);
    if (['qt  '].includes(brand)) return found('mov');
    if (['M4A ', 'M4B '].includes(brand)) return found('m4a');
    if (['avif', 'avis'].includes(brand)) return found('avif');
    if (['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return found('heic');
    if (['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'M4VH', 'mp4v', 'msdh'].includes(brand)) {
      return found('mp4');
    }
    return found('mp4', 'probable');
  }

  // Matroska / WebM (EBML header)
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return found('mkv', 'probable');

  // ZIP containers (also DOCX/XLSX/PPTX/EPUB)
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return found('zip', 'probable');
  }

  // MP3: ID3 tag or an MPEG frame sync
  if (ascii(bytes, 0, 3) === 'ID3') return found('mp3');
  if (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0) return found('mp3', 'probable');

  // ADTS AAC
  if (bytes[0] === 0xff && (bytes[1]! & 0xf6) === 0xf0) return found('aac', 'probable');

  // SVG is text; look for an <svg root element near the start
  if (/^\s*(<\?xml[\s\S]{0,200}\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return found('svg');

  return none;
}

/** Read just enough bytes to identify a file without loading it into memory. */
export async function sniffFile(file: File | Blob): Promise<SniffResult> {
  const size = Math.min(file.size, 4096);
  const buffer = await file.slice(0, size).arrayBuffer();
  return sniffBytes(new Uint8Array(buffer));
}

export interface ValidationRule {
  /** Extensions accepted by the tool, lower-case with a leading dot. */
  allowedExtensions: string[];
  /** Content families accepted by the tool. Empty = rely on extension only. */
  allowedFamilies?: FileFamily[];
  maxBytes: number;
  maxFiles?: number;
  minBytes?: number;
}

export type ValidationResult = { ok: true } | { ok: false; error: string; code: ValidationCode };

export type ValidationCode = 'empty' | 'too-large' | 'too-many' | 'unsupported-type' | 'corrupt' | 'duplicate';

export function validateFile(file: File, rule: ValidationRule): ValidationResult {
  if (file.size === 0) {
    return { ok: false, code: 'empty', error: `"${file.name}" is empty (0 bytes).` };
  }
  if (rule.minBytes && file.size < rule.minBytes) {
    return { ok: false, code: 'empty', error: `"${file.name}" is too small to be a valid file.` };
  }
  if (file.size > rule.maxBytes) {
    return {
      ok: false,
      code: 'too-large',
      error: `"${file.name}" is ${formatMb(file.size)} but this tool accepts up to ${formatMb(rule.maxBytes)}.`,
    };
  }
  const ext = extOf(file.name);
  if (!rule.allowedExtensions.includes(ext)) {
    return {
      ok: false,
      code: 'unsupported-type',
      error: `"${file.name}" is a ${ext ? ext.slice(1).toUpperCase() : 'unknown'} file. This tool accepts: ${rule.allowedExtensions
        .map((e) => e.slice(1).toUpperCase())
        .join(', ')}.`,
    };
  }
  return { ok: true };
}

/** Content-level check, run after `validateFile`. */
export async function validateContent(file: File, rule: ValidationRule): Promise<ValidationResult> {
  const sniff = await sniffFile(file);
  if (sniff.family === 'unknown') {
    return {
      ok: false,
      code: 'corrupt',
      error: `"${file.name}" does not look like a readable ${extOf(file.name).slice(1).toUpperCase() || 'supported'} file. It may be corrupted, truncated or password-protected.`,
    };
  }
  if (rule.allowedFamilies?.length && !rule.allowedFamilies.includes(sniff.family)) {
    return {
      ok: false,
      code: 'unsupported-type',
      error: `"${file.name}" has a ${extOf(file.name)} extension but its contents are ${sniff.family.toUpperCase()}. Renaming a file does not convert it — use the matching tool.`,
    };
  }
  return { ok: true };
}

export function formatMb(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** `['.jpg','.png']` -> an `accept` attribute string, including MIME types. */
export function toAcceptAttribute(extensions: string[]): string {
  const mimes = new Set<string>();
  for (const ext of extensions) {
    const family = (Object.keys(FAMILY_META) as Exclude<FileFamily, 'unknown'>[]).find((f) =>
      FAMILY_META[f].extensions.includes(ext),
    );
    if (family) mimes.add(FAMILY_META[family].mime);
  }
  return [...extensions, ...mimes].join(',');
}

export function isImageFamily(family: FileFamily): boolean {
  return ['jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico', 'tiff', 'heic'].includes(family);
}
