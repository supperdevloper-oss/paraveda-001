/**
 * PDF engine.
 *
 * Two open-source libraries, both loaded lazily and only by the tool that needs
 * them, so the 1.3 MB pdf.js bundle is never downloaded by someone who only
 * wants to resize a JPG:
 *
 *   pdf-lib   (MIT)  — write and rearrange PDF objects: merge, split, rotate,
 *                      delete pages, embed images.
 *   pdf.js    (Apache-2.0) — interpret and rasterise PDF pages, in a Web Worker.
 */

import { SITE } from '../site-config';
import { parsePageRange, splitIntoChunks, chunkEveryN, formatPageList } from '../utils/pages';
import { baseName, extOf, withExtension } from '../utils/format';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import type { EngineHooks } from './image';
import { mimeForExt } from './image';
import { detectCapabilities } from './capabilities';

export interface PdfFileInput {
  name: string;
  data: Uint8Array;
}

export interface PdfFileOutput {
  name: string;
  data: Uint8Array;
}

export interface ImagePageOutput {
  name: string;
  blob: Blob;
  width: number;
  height: number;
  page: number;
}

const PAGE_SIZES_PT: Record<string, [number, number]> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};
const MM_TO_PT = 2.834645669;

function assertNotCancelled(hooks?: EngineHooks): void {
  if (hooks?.signal?.cancelled) throw Object.assign(new Error('Cancelled.'), { code: 'cancelled' });
}

let pdfLibPromise: Promise<typeof import('pdf-lib')> | null = null;
async function pdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import('pdf-lib');
  return pdfLibPromise;
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(async (mod) => {
      // The worker and its font/CMap data are vendored to /vendor/pdfjs by
      // scripts/vendor-wasm.mjs so they are same-origin and cacheable.
      const base = typeof location !== 'undefined' ? location.origin : 'http://localhost';
      mod.GlobalWorkerOptions.workerSrc = new URL('/vendor/pdfjs/pdf.worker.min.mjs', base).toString();
      return mod;
    });
  }
  return pdfjsPromise;
}

function vendorUrl(path: string): string {
  const base = typeof location !== 'undefined' ? location.origin : 'http://localhost';
  return new URL(`/vendor/pdfjs/${path}`, base).toString();
}

export async function readPdf(data: Uint8Array, opts: { ignoreEncryption?: boolean } = {}) {
  const { PDFDocument } = await pdfLib();
  try {
    return await PDFDocument.load(data, {
      ignoreEncryption: opts.ignoreEncryption ?? false,
      updateMetadata: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/encrypt/i.test(message)) {
      throw new Error('This PDF is password-protected or encrypted. Remove the protection and try again.');
    }
    throw new Error(`This file could not be read as a PDF. ${message}`);
  }
}

export async function getPdfPageCount(file: Blob): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await readPdf(data);
  return doc.getPageCount();
}

/* -------------------------------------------------------------------------- */
/* Merge                                                                      */
/* -------------------------------------------------------------------------- */

export interface MergeOptions {
  order?: 'list' | 'name' | 'size';
  sizes?: Record<string, number>;
  pageRanges?: string;
  outputName?: string;
  hooks?: EngineHooks;
}

export async function mergePdfs(inputs: PdfFileInput[], options: MergeOptions = {}): Promise<PdfFileOutput> {
  if (inputs.length < 2) throw new Error('Add at least two PDF files to merge.');
  const { PDFDocument } = await pdfLib();

  const files = [...inputs];
  if (options.order === 'name') files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  else if (options.order === 'size') {
    const sizes = options.sizes ?? {};
    files.sort((a, b) => (sizes[a.name] ?? a.data.byteLength) - (sizes[b.name] ?? b.data.byteLength));
  }

  const out = await PDFDocument.create();
  const copiedFrom: string[] = [];

  for (const input of files) {
    assertNotCancelled(options.hooks);
    const src = await readPdf(input.data);
    const pageCount = src.getPageCount();
    let indices: number[] = Array.from({ length: pageCount }, (_, i) => i);

    if (options.pageRanges && options.pageRanges.trim()) {
      const parsed = parsePageRange(options.pageRanges, { pageCount, sort: true });
      if (!parsed.ok) throw new Error(`${input.name}: ${parsed.error}`);
      indices = parsed.pages.map((p) => p - 1);
    }
    if (indices.length === 0) throw new Error(`${input.name}: the page range selected no pages.`);

    const pages = await out.copyPages(src, indices);
    assertNotCancelled(options.hooks);
    for (const page of pages) out.addPage(page);
    copiedFrom.push(input.name);
  }

  out.setProducer(SITE.name);
  out.setCreator(SITE.name);
  out.setModificationDate(new Date());

  const bytes = await out.save({ useObjectStreams: true });
  return {
    name: options.outputName ?? `merged-${copiedFrom.length}-files.pdf`,
    data: new Uint8Array(bytes),
  };
}

/* -------------------------------------------------------------------------- */
/* Split                                                                      */
/* -------------------------------------------------------------------------- */

export type SplitMode = 'ranges' | 'every' | 'each' | 'extract';

export interface SplitOptions {
  mode: SplitMode;
  pages?: string;
  everyN?: number;
  hooks?: EngineHooks;
}

export async function splitPdf(input: PdfFileInput, options: SplitOptions): Promise<PdfFileOutput[]> {
  const { PDFDocument } = await pdfLib();
  const src = await readPdf(input.data);
  const pageCount = src.getPageCount();
  if (pageCount === 0) throw new Error('This PDF has no pages.');
  const stem = baseName(input.name) || 'document';

  const buildDoc = async (pages: number[], suffix: string): Promise<PdfFileOutput> => {
    assertNotCancelled(options.hooks);
    const doc = await PDFDocument.create();
    const indices = pages.map((p) => p - 1);
    const copied = await doc.copyPages(src, indices);
    assertNotCancelled(options.hooks);
    for (const page of copied) doc.addPage(page);
    doc.setProducer(SITE.name);
    doc.setCreator(SITE.name);
    const bytes = await doc.save({ useObjectStreams: true });
    return { name: `${stem}-${suffix}.pdf`, data: new Uint8Array(bytes) };
  };

  const outputs: PdfFileOutput[] = [];

  if (options.mode === 'each') {
    for (let p = 1; p <= pageCount; p += 1) {
      assertNotCancelled(options.hooks);
      outputs.push(await buildDoc([p], `page-${String(p).padStart(String(pageCount).length, '0')}`));
    }
    return outputs;
  }

  if (options.mode === 'every') {
    const n = Math.max(1, Math.round(options.everyN || 1));
    if (n > pageCount) throw new Error(`"Pages per file" is ${n} but the document only has ${pageCount} page(s).`);
    const chunks = chunkEveryN(pageCount, n);
    for (let i = 0; i < chunks.length; i += 1) {
      assertNotCancelled(options.hooks);
      const chunk = chunks[i]!;
      outputs.push(await buildDoc(chunk, `part-${i + 1}-p${chunk[0]}-${chunk[chunk.length - 1]}`));
    }
    return outputs;
  }

  const rangesText = (options.pages ?? '').trim();
  if (!rangesText) {
    throw new Error(
      options.mode === 'extract'
        ? 'Enter the pages you want to extract, e.g. "2,5,8-10".'
        : 'Enter at least one page range, e.g. "1-3,4-6".',
    );
  }

  if (options.mode === 'extract') {
    const parsed = parsePageRange(rangesText, { pageCount, sort: true });
    if (!parsed.ok) throw new Error(parsed.error);
    if (parsed.pages.length === pageCount) {
      throw new Error('That selection covers every page — the result would be identical to the original.');
    }
    outputs.push(await buildDoc(parsed.pages, `p${parsed.pages[0]}-${parsed.pages[parsed.pages.length - 1]}`));
    return outputs;
  }

  // 'ranges' — each comma-separated range becomes its own document
  const parts = rangesText.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('Enter at least one page range.');
  for (const part of parts) {
    const parsed = parsePageRange(part, { pageCount, sort: true });
    if (!parsed.ok) throw new Error(`Range "${part}": ${parsed.error}`);
    outputs.push(
      await buildDoc(parsed.pages, `p${parsed.pages[0]}${parsed.pages.length > 1 ? `-${parsed.pages[parsed.pages.length - 1]}` : ''}`),
    );
  }
  return outputs;
}

/* -------------------------------------------------------------------------- */
/* Rotate                                                                     */
/* -------------------------------------------------------------------------- */

export interface RotateOptions {
  angle: 90 | 180 | 270;
  hooks?: EngineHooks;
  scope?: 'all' | 'range';
  pages?: string;
  relative?: 'add' | 'set';
}

export async function rotatePdf(input: PdfFileInput, options: RotateOptions): Promise<PdfFileOutput> {
  const { degrees } = await pdfLib();
  const doc = await readPdf(input.data);
  const pageCount = doc.getPageCount();
  if (pageCount === 0) throw new Error('This PDF has no pages.');

  let targets: number[] = Array.from({ length: pageCount }, (_, i) => i);
  if (options.scope === 'range' && !(options.pages ?? '').trim()) throw new Error('Enter the page numbers to rotate, e.g. 2,4-6.');
  if (options.scope === 'range' && (options.pages ?? '').trim()) {
    const parsed = parsePageRange(options.pages!, { pageCount, sort: true });
    if (!parsed.ok) throw new Error(parsed.error);
    targets = parsed.pages.map((p) => p - 1);
  }
  if (!targets.length) throw new Error('No pages match the range you entered.');

  const pages = doc.getPages();
  for (const index of targets) {
    assertNotCancelled(options.hooks);
    const page = pages[index];
    if (!page) continue;
    if (options.relative === 'set') {
      page.setRotation(degrees(options.angle));
    } else {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + options.angle) % 360));
    }
  }
  doc.setProducer(SITE.name);
  doc.setModificationDate(new Date());
  const bytes = await doc.save({ useObjectStreams: true });
  return { name: withExtension(input.name, 'pdf').replace(/\.pdf$/, `-rotated.pdf`), data: new Uint8Array(bytes) };
}

/* -------------------------------------------------------------------------- */
/* Delete pages                                                               */
/* -------------------------------------------------------------------------- */

export interface DeletePagesOptions {
  mode: 'delete' | 'keep';
  pages: string;
  hooks?: EngineHooks;
}

export async function deletePdfPages(input: PdfFileInput, options: DeletePagesOptions): Promise<PdfFileOutput> {
  const doc = await readPdf(input.data);
  const pageCount = doc.getPageCount();
  const parsed = parsePageRange(options.pages ?? '', { pageCount, sort: true });
  if (!parsed.ok) throw new Error(parsed.error);

  const listed = new Set(parsed.pages);
  const keepPages = options.mode === 'delete'
    ? Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => !listed.has(p))
    : Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => listed.has(p));

  if (keepPages.length === 0) {
    throw new Error(
      options.mode === 'delete'
        ? 'That would delete every page. A PDF must keep at least one page.'
        : 'None of the pages you listed exist in this document.',
    );
  }
  if (keepPages.length === pageCount) {
    throw new Error('That selection leaves the document unchanged — check the page numbers.');
  }

  // pdf-lib only exposes removePage(index); remove from the end so earlier
  // indexes stay valid.
  const removeIndexes = Array.from({ length: pageCount }, (_, i) => i + 1)
    .filter((p) => !keepPages.includes(p))
    .map((p) => p - 1)
    .sort((a, b) => b - a);
  for (const index of removeIndexes) { assertNotCancelled(options.hooks); doc.removePage(index); }

  doc.setProducer(SITE.name);
  doc.setModificationDate(new Date());
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    name: withExtension(input.name, 'pdf').replace(/\.pdf$/, `-pages-${formatPageList(keepPages).replace(/[\s,]/g, '')}.pdf`),
    data: new Uint8Array(bytes),
  };
}

/* -------------------------------------------------------------------------- */
/* Images -> PDF                                                              */
/* -------------------------------------------------------------------------- */

export interface ImageToPdfItem {
  name: string;
  data: Uint8Array;
  ext: string;
  width: number;
  height: number;
}

export interface ImagesToPdfOptions {
  combine: 'single' | 'separate';
  hooks?: EngineHooks;
  pageSize: 'fit' | keyof typeof PAGE_SIZES_PT;
  orientation: 'auto' | 'portrait' | 'landscape';
  marginMm: number;
  outputName?: string;
}

export async function imagesToPdf(
  items: ImageToPdfItem[],
  options: ImagesToPdfOptions,
): Promise<PdfFileOutput[]> {
  if (!items.length) throw new Error('Add at least one image.');
  const { PDFDocument } = await pdfLib();
  const margin = Math.max(0, options.marginMm) * MM_TO_PT;

  const place = async (doc: Awaited<ReturnType<typeof PDFDocument.create>>, item: ImageToPdfItem) => {
    const ext = extOf(item.name) || `.${item.ext.replace(/^\./, '')}`;
    let embedded;
    if (ext === '.jpg' || ext === '.jpeg') embedded = await doc.embedJpg(item.data);
    else if (ext === '.png') embedded = await doc.embedPng(item.data);
    else throw new Error(`${item.name}: only JPG and PNG data can be embedded directly. Re-encode the image first.`);

    const imgW = embedded.width || item.width;
    const imgH = embedded.height || item.height;

    let pageW: number;
    let pageH: number;
    if (options.pageSize === 'fit') {
      pageW = imgW + margin * 2;
      pageH = imgH + margin * 2;
    } else {
      const size = PAGE_SIZES_PT[options.pageSize] ?? PAGE_SIZES_PT.a4;
      pageW = size[0];
      pageH = size[1];
      const landscapeWanted =
        options.orientation === 'landscape' || (options.orientation === 'auto' && imgW > imgH);
      if (landscapeWanted && pageW < pageH) [pageW, pageH] = [pageH, pageW];
      if (!landscapeWanted && pageW > pageH && options.orientation !== 'auto') [pageW, pageH] = [pageH, pageW];
    }

    const page = doc.addPage([pageW, pageH]);
    const availW = Math.max(1, pageW - margin * 2);
    const availH = Math.max(1, pageH - margin * 2);
    const scale = Math.min(availW / imgW, availH / imgH, options.pageSize === 'fit' ? 1 : Infinity);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    page.drawImage(embedded, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  };

  const outputs: PdfFileOutput[] = [];

  if (options.combine === 'separate') {
    for (const item of items) {
      assertNotCancelled(options.hooks);
      const doc = await PDFDocument.create();
      await place(doc, item);
      doc.setProducer(SITE.name);
      doc.setCreationDate(new Date());
      const bytes = await doc.save({ useObjectStreams: true });
      outputs.push({ name: `${baseName(item.name)}.pdf`, data: new Uint8Array(bytes) });
    }
    return outputs;
  }

  const doc = await PDFDocument.create();
  for (const item of items) { assertNotCancelled(options.hooks); await place(doc, item); }
  doc.setProducer(SITE.name);
  doc.setCreationDate(new Date());
  const bytes = await doc.save({ useObjectStreams: true });
  outputs.push({ name: options.outputName ?? `${SITE.slug}-images.pdf`, data: new Uint8Array(bytes) });
  return outputs;
}

/* -------------------------------------------------------------------------- */
/* PDF -> images (pdf.js)                                                     */
/* -------------------------------------------------------------------------- */

export interface PdfToImagesOptions {
  outputExt: 'jpg' | 'png' | 'webp';
  scale: number;
  pages?: string;
  quality: number;
  background?: string;
  hooks?: EngineHooks;
}

export async function pdfToImages(input: PdfFileInput, options: PdfToImagesOptions): Promise<ImagePageOutput[]> {
  const caps = await detectCapabilities();
  if (!caps.canvas) throw new Error('This browser has no canvas support, so PDF pages cannot be rendered.');

  const mime = mimeForExt(options.outputExt);
  if (!mime) throw new Error(`"${options.outputExt}" is not a supported image format.`);

  const mod = await pdfjs();
  const loadingTask = mod.getDocument({
    // pdf.js transfers ownership of the buffer to its worker: hand it a copy so
    // the caller can still use the original bytes afterwards.
    data: input.data.slice(0),
    cMapUrl: vendorUrl('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: vendorUrl('standard_fonts/'),
    iccUrl: vendorUrl('iccs/'),
    disableFontFace: false,
    verbosity: 0,
  });

  let doc: PDFDocumentProxy;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(message)) {
      throw new Error('This PDF is password-protected. pdf.js cannot open it without the password in this release.');
    }
    throw new Error(`This PDF could not be opened. ${message}`);
  }

  try {
    const pageCount = doc.numPages;
    const wanted = (options.pages ?? '').trim()
      ? (() => {
          const parsed = parsePageRange(options.pages!, { pageCount, sort: true });
          if (!parsed.ok) throw new Error(parsed.error);
          return parsed.pages;
        })()
      : Array.from({ length: pageCount }, (_, i) => i + 1);

    if (!wanted.length) throw new Error('No pages matched the range you entered.');

    const stem = baseName(input.name) || 'page';
    const pad = String(pageCount).length;
    const outputs: ImagePageOutput[] = [];
    const canvas = document.createElement('canvas');
    const total = wanted.length;

    for (let i = 0; i < wanted.length; i += 1) {
      if (options.hooks?.signal?.cancelled) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
      const pageNumber = wanted[i]!;
      options.hooks?.onProgress?.({
        label: `Rendering page ${pageNumber} of ${pageCount}`,
        ratio: total > 0 ? i / total : null,
      });

      const page = await doc.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: Math.max(0.25, Math.min(6, options.scale || 2)) });
        const width = Math.max(1, Math.floor(viewport.width));
        const height = Math.max(1, Math.floor(viewport.height));
        if (width > 16384 || height > 16384) {
          throw new Error(`Page ${pageNumber} at this resolution needs a ${width} × ${height} canvas, which is too large. Lower the resolution.`);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: options.outputExt === 'png' || options.outputExt === 'webp' });
        if (!ctx) throw new Error('The browser refused to allocate a drawing surface.');

        if (options.outputExt === 'jpg') {
          ctx.fillStyle = options.background || '#ffffff';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }

        await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport, canvas }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, mime === 'image/png' ? undefined : Math.max(0.01, Math.min(1, options.quality / 100))));
        if (!blob || blob.size === 0) throw new Error(`Page ${pageNumber} produced an empty image.`);
        if (blob.type && blob.type !== mime && mime !== 'image/png') {
          throw new Error(`Your browser cannot create ${options.outputExt.toUpperCase()} files. Choose JPG or PNG instead.`);
        }

        outputs.push({
          name: `${stem}-page-${String(pageNumber).padStart(pad, '0')}.${options.outputExt}`,
          blob,
          width,
          height,
          page: pageNumber,
        });
      } finally {
        page.cleanup();
        // Let the browser breathe between pages so long documents do not OOM.
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    canvas.width = 0;
    canvas.height = 0;
    options.hooks?.onProgress?.({ label: 'Done', ratio: 1 });
    return outputs;
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      /* ignore */
    }
  }
}

/** Render a single page thumbnail for the file-list preview. */
export async function renderPdfThumbnail(file: Blob, maxWidth = 160): Promise<{ url: string; width: number; height: number } | null> {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const mod = await pdfjs();
    const task = mod.getDocument({
      data,
      cMapUrl: vendorUrl('cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: vendorUrl('standard_fonts/'),
      verbosity: 0,
    });
    const doc = await task.promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, maxWidth / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const url = canvas.toDataURL('image/jpeg', 0.7);
      page.cleanup();
      return { url, width: canvas.width, height: canvas.height };
    } finally {
      await task.destroy();
    }
  } catch {
    return null;
  }
}

export { splitIntoChunks, formatPageList };
