/**
 * Image engine — canvas based, entirely in the browser.
 *
 * Pipeline for one file:
 *   decode  ->  plan (pure maths)  ->  execute (worker or main thread)  ->  encode
 *
 * When "target file size" mode is on, the encode step is repeated with a real
 * binary search on the quality parameter and the smallest result that fits is
 * returned together with the quality value it needed.
 */

import { canEncode, detectCapabilities, type ImageCodec } from './capabilities';
import {
  computeImagePlan,
  nextQualityProbe,
  recordQualityProbe,
  qualitySearchConverged,
  startQualitySearch,
  type ImagePlan,
  type Rect,
  type ResizeMode,
  type Size,
} from './image-math';
import { extOf, uid, withExtension } from '../utils/format';

/* -------------------------------------------------------------------------- */
/* Public option / result types                                               */
/* -------------------------------------------------------------------------- */

export interface ImageResizeOptions {
  mode: ResizeMode;
  width?: number;
  height?: number;
  percent?: number;
  maxDimension?: number;
}

export interface ImageConvertOptions {
  /** 'jpg' | 'png' | 'webp' */
  outputExt: string;
  /** 1..100 */
  quality: number;
  /** CSS colour flattened behind transparent pixels; null keeps transparency. */
  background?: string | null;
  autoOrient?: boolean;
  resize?: ImageResizeOptions;
  crop?: Rect | null;
  rotationDeg?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** When set, the encoder searches for the highest quality fitting this size. */
  targetBytes?: number | null;
}

export interface ImageResult {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  /** The quality actually used — differs from the request in target-size mode. */
  qualityUsed: number;
  /** Number of encode passes performed. */
  attempts: number;
}

export interface EngineHooks {
  signal?: { cancelled: boolean };
  onProgress?: (info: { label?: string; ratio?: number | null }) => void;
}

const EXT_TO_MIME: Record<string, ImageCodec> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export function mimeForExt(ext: string): ImageCodec | null {
  return EXT_TO_MIME[ext.replace(/^\./, '').toLowerCase()] ?? null;
}

/** Pick a sensible output extension when the user chose "keep the source format". */
export function resolveOutputExt(sourceName: string, requested: string): string {
  const wanted = requested.replace(/^\./, '').toLowerCase();
  if (wanted && wanted !== 'auto' && EXT_TO_MIME[wanted]) return wanted === 'jpeg' ? 'jpg' : wanted;
  const src = extOf(sourceName).replace(/^\./, '').toLowerCase();
  if (src === 'jpeg') return 'jpg';
  // AVIF decode is accepted as input, but it is not offered by any tool as an
  // output: when auto is selected, use universally available JPEG instead.
  if (src === 'jpg' || src === 'png' || src === 'webp') return src;
  return 'jpg';
}

/** Throws with a user-readable message when the browser cannot write `ext`. */
export async function assertCanEncode(ext: string): Promise<ImageCodec> {
  const mime = mimeForExt(ext);
  if (!mime) throw new Error(`"${ext}" is not an image format this tool can write.`);
  if (!(await canEncode(mime))) {
    throw new Error(
      `Your browser cannot create ${ext.toUpperCase()} files. This is a browser limitation, not a problem with your image — try a different output format or a different browser.`,
    );
  }
  return mime;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function throwIfCancelled(hooks?: EngineHooks): void {
  if (hooks?.signal?.cancelled) {
    const err = new Error('cancelled');
    (err as Error & { code?: string }).code = 'cancelled';
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Decoding                                                                   */
/* -------------------------------------------------------------------------- */

export interface DecodedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  isBitmap: boolean;
  url?: string;
  dispose(): void;
}

export async function decodeImage(file: Blob, autoOrient = true): Promise<DecodedImage> {
  const caps = await detectCapabilities();

  if (caps.createImageBitmap) {
    const orientation = (autoOrient ? 'from-image' : 'none') as 'from-image' | 'none';
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: orientation });
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          isBitmap: true,
          dispose: () => bitmap.close?.(),
        };
      }
      bitmap.close?.();
    } catch {
      // Older Safari rejects the options bag; retry without it below.
      try {
        const bitmap = await createImageBitmap(file);
        if (bitmap.width > 0 && bitmap.height > 0) {
          return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            isBitmap: true,
            dispose: () => bitmap.close?.(),
          };
        }
        bitmap.close?.();
      } catch {
        /* fall through to <img> */
      }
    }
  }

  // Fallback: an <img> element. Modern browsers honour EXIF orientation here too.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.decoding = 'async';
      const timer = setTimeout(() => reject(new Error('timeout')), 30_000);
      el.onload = () => {
        clearTimeout(timer);
        resolve(el);
      };
      el.onerror = () => {
        clearTimeout(timer);
        reject(new Error('decode-failed'));
      };
      el.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('decode-failed');
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      isBitmap: false,
      url,
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      'This image could not be decoded. It may be corrupted, truncated, password-protected, or in a format your browser cannot read.',
    );
  }
}

/** Read the pixel size of an image without keeping it decoded. */
export async function readImageSize(file: Blob, autoOrient = true): Promise<Size> {
  const decoded = await decodeImage(file, autoOrient);
  const size = { w: decoded.width, h: decoded.height };
  decoded.dispose();
  return size;
}

/* -------------------------------------------------------------------------- */
/* Executors                                                                  */
/* -------------------------------------------------------------------------- */

interface Executor {
  encode(plan: ImagePlan, mime: ImageCodec, quality: number): Promise<{ blob: Blob; width: number; height: number }>;
  release(): void;
}

function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function context2d(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('The browser refused to allocate a drawing surface. Free some memory and try again.');
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  return ctx;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: ImageCodec,
  quality: number,
): Promise<Blob> {
  const q = mime === 'image/png' ? undefined : Math.max(0.01, Math.min(1, quality));
  let blob: Blob | null = null;
  if ('convertToBlob' in canvas) {
    blob = await canvas.convertToBlob({ type: mime, quality: q });
  } else {
    blob = await new Promise<Blob | null>((resolve) => {
      (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), mime, q);
    });
  }
  if (!blob || blob.size === 0) throw new Error('The browser produced an empty file for this format.');
  if (blob.type && blob.type !== mime && mime !== 'image/png') {
    throw new Error(`This browser cannot write ${mime} files. Choose a different output format.`);
  }
  return blob;
}

/** Mirrors public/workers/image.worker.js exactly. */
async function executePlanOnMainThread(
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas,
  srcW: number,
  srcH: number,
  plan: ImagePlan,
  mime: ImageCodec,
  quality: number,
  hooks?: EngineHooks,
): Promise<{ blob: Blob; width: number; height: number }> {

  let current: ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas = source;
  let currentW = plan.crop.w;
  let currentH = plan.crop.h;

  const isFullSource = plan.crop.x === 0 && plan.crop.y === 0 && plan.crop.w === srcW && plan.crop.h === srcH;
  if (!isFullSource) {
    const cropCanvas = createCanvas(plan.crop.w, plan.crop.h);
    context2d(cropCanvas).drawImage(current as CanvasImageSource, plan.crop.x, plan.crop.y, plan.crop.w, plan.crop.h, 0, 0, plan.crop.w, plan.crop.h);
    current = cropCanvas;
  } else {
    currentW = srcW;
    currentH = srcH;
  }

  for (const step of plan.ladder) {
    throwIfCancelled(hooks);
    const next = createCanvas(step.w, step.h);
    context2d(next).drawImage(current as CanvasImageSource, 0, 0, currentW, currentH, 0, 0, step.w, step.h);
    current = next;
    currentW = step.w;
    currentH = step.h;
    await yieldToBrowser();
  }

  const out = createCanvas(plan.out.w, plan.out.h);
  const ctx = context2d(out);
  if (plan.background) {
    ctx.fillStyle = plan.background;
    ctx.fillRect(0, 0, plan.out.w, plan.out.h);
  }
  ctx.save();
  ctx.translate(plan.out.w / 2, plan.out.h / 2);
  if (plan.flipX) ctx.scale(-1, 1);
  if (plan.flipY) ctx.scale(1, -1);
  if (plan.rotationDeg) ctx.rotate((plan.rotationDeg * Math.PI) / 180);
  ctx.drawImage(current as CanvasImageSource, -currentW / 2, -currentH / 2, currentW, currentH);
  ctx.restore();

  throwIfCancelled(hooks);
  const blob = await canvasToBlob(out, mime, quality);
  return { blob, width: plan.out.w, height: plan.out.h };
}

/* ---- worker pool ---------------------------------------------------------- */

let worker: Worker | null = null;
let workerBroken = false;
const liveWorkerSessions = new Set<string>();

function workerUrl(): string {
  // Same-origin static asset: works in dev, in a static export and on any host.
  const base = typeof location !== 'undefined' ? location.origin : 'http://localhost';
  return new URL('/workers/image.worker.js', base).toString();
}

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(workerUrl(), { type: 'classic', name: 'convertflow-image' });
    worker.onerror = () => {
      workerBroken = true;
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

/** Terminate the shared worker and free its memory. */
export function cancelImageWorkerTasks(): void {
  if (!worker) return;
  for (const sessionId of liveWorkerSessions) worker.postMessage({ type: 'cancel', sessionId });
}

export function disposeImageWorker(): void {
  worker?.terminate();
  worker = null;
  liveWorkerSessions.clear();
}

class WorkerExecutor implements Executor {
  private readonly worker: Worker;
  private readonly sessionId = uid('img');
  private readonly pending = new Map<string, (msg: MessageEvent) => void>();
  private readonly listener: (e: MessageEvent) => void;

  constructor(w: Worker, bitmap: ImageBitmap) {
    this.worker = w;
    liveWorkerSessions.add(this.sessionId);
    this.listener = (e: MessageEvent) => {
      const data = e.data ?? {};
      if (data.type === 'prepared' && data.sessionId === this.sessionId) {
        this.pending.get('prepared')?.(e);
        this.pending.delete('prepared');
      } else if (data.jobId) {
        this.pending.get(data.jobId)?.(e);
        this.pending.delete(data.jobId);
      }
    };
    w.addEventListener('message', this.listener);
    w.postMessage({ type: 'prepare', sessionId: this.sessionId, bitmap }, [bitmap]);
  }

  private wait(key: string, timeoutMs: number): Promise<MessageEvent> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error('timeout'));
      }, timeoutMs);
      this.pending.set(key, (e) => {
        clearTimeout(timer);
        resolve(e);
      });
    });
  }

  async ready(): Promise<void> {
    const event = await this.wait('prepared', 30_000);
    const data = event.data ?? {};
    if (data.type === 'error') throw new Error(data.message || 'The image worker could not read the file.');
  }

  async encode(plan: ImagePlan, mime: ImageCodec, quality: number) {
    const jobId = uid('job');
    const waiting = this.wait(jobId, 120_000);
    this.worker.postMessage({ type: 'encode', sessionId: this.sessionId, jobId, plan, mime, quality });
    const event = await waiting;
    const data = event.data ?? {};
    if (data.type === 'encoded') return { blob: data.blob as Blob, width: data.width as number, height: data.height as number };
    if (data.type === 'cancelled') {
      const err = new Error('cancelled');
      (err as Error & { code?: string }).code = 'cancelled';
      throw err;
    }
    throw new Error(data.message || 'The image worker failed to encode this file.');
  }

  release(): void {
    this.worker.postMessage({ type: 'release', sessionId: this.sessionId });
    liveWorkerSessions.delete(this.sessionId);
    this.worker.removeEventListener('message', this.listener);
    this.pending.clear();
  }
}

class MainThreadExecutor implements Executor {
  constructor(
    private readonly source: ImageBitmap | HTMLImageElement,
    private readonly srcW: number,
    private readonly srcH: number,
    private readonly hooks?: EngineHooks,
  ) {}
  async encode(plan: ImagePlan, mime: ImageCodec, quality: number) {
    return executePlanOnMainThread(this.source, this.srcW, this.srcH, plan, mime, quality, this.hooks);
  }
  release(): void {
    /* nothing to release; the caller owns the decoded image */
  }
}

/* -------------------------------------------------------------------------- */
/* The public entry point                                                     */
/* -------------------------------------------------------------------------- */

export async function convertImage(
  file: File | Blob,
  fileName: string,
  options: ImageConvertOptions,
  hooks?: EngineHooks,
): Promise<ImageResult> {
  throwIfCancelled(hooks);
  const caps = await detectCapabilities();
  if (!caps.canvas) throw new Error('This browser has no canvas support, so images cannot be processed here.');

  const outExt = resolveOutputExt(fileName, options.outputExt);
  const mime = await assertCanEncode(outExt);

  // Transparent-capable output formats do not need a background fill.
  const keepsAlpha = outExt === 'png' || outExt === 'webp';
  const background = keepsAlpha ? null : options.background || '#ffffff';

  hooks?.onProgress?.({ label: 'Decoding image…', ratio: null });
  const decoded = await decodeImage(file, options.autoOrient !== false);
  const sourceWidth = decoded.width;
  const sourceHeight = decoded.height;

  let plan: ImagePlan;
  try {
    plan = computeImagePlan(sourceWidth, sourceHeight, {
      resize: {
        mode: options.resize?.mode ?? 'keep',
        width: options.resize?.width,
        height: options.resize?.height,
        percent: options.resize?.percent,
        maxDimension: options.resize?.maxDimension,
      },
      crop: options.crop ?? null,
      rotationDeg: options.rotationDeg ?? 0,
      flipX: !!options.flipX,
      flipY: !!options.flipY,
      background,
    });
  } catch (err) {
    decoded.dispose();
    throw err;
  }

  // Choose an executor. The worker needs a transferable ImageBitmap.
  let executor: Executor | null = null;
  if (decoded.isBitmap && caps.offscreenCanvas && caps.webWorkers && !workerBroken) {
    const w = getWorker();
    if (w) {
      try {
        // Transfer a clone so a worker startup failure still leaves the source
        // bitmap usable by the main-thread fallback.
        const workerBitmap = await createImageBitmap(decoded.source as ImageBitmap);
        const we = new WorkerExecutor(w, workerBitmap);
        await we.ready();
        executor = we;
      } catch {
        workerBroken = true;
        executor = null;
      }
    }
  }
  if (!executor) executor = new MainThreadExecutor(decoded.source, sourceWidth, sourceHeight, hooks);

  try {
    const baseQuality = Math.max(1, Math.min(100, Math.round(options.quality || 90))) / 100;

    if (!options.targetBytes || options.targetBytes <= 0 || outExt === 'png') {
      hooks?.onProgress?.({ label: 'Encoding…', ratio: null });
      const first = await executor.encode(plan, mime, baseQuality);
      return finish(first.blob, first.width, first.height, baseQuality, 1);
    }

    // ---- target file size: real binary search -----------------------------
    let state = startQualitySearch(0.3, 0.95, 7);
    let best: { blob: Blob; quality: number } | null = null;
    let smallest: { blob: Blob; quality: number } | null = null;
    let attempts = 0;

    while (true) {
      throwIfCancelled(hooks);
      const q = nextQualityProbe(state);
      attempts += 1;
      hooks?.onProgress?.({
        label: `Searching for ${Math.round(options.targetBytes / 1024)} KB — trying quality ${Math.round(q * 100)}%`,
        ratio: state.iterations / state.maxIterations,
      });
      const encoded = await executor.encode(plan, mime, q);
      if (!smallest || encoded.blob.size < smallest.blob.size) smallest = { blob: encoded.blob, quality: q };
      if (encoded.blob.size <= options.targetBytes && (!best || encoded.blob.size > best.blob.size)) {
        best = { blob: encoded.blob, quality: q };
      }
      state = recordQualityProbe(state, q, encoded.blob.size, options.targetBytes);
      await yieldToBrowser();
      if (qualitySearchConverged(state)) break;
    }

    const chosen = best ?? smallest;
    if (!chosen) throw new Error('The encoder produced no output for this image.');
    return finish(chosen.blob, plan.out.w, plan.out.h, chosen.quality, attempts);
  } finally {
    // Releases the worker session, or closes the ImageBitmap / object URL.
    executor.release();
    decoded.dispose();
  }

  function finish(blob: Blob, width: number, height: number, qualityUsed: number, attempts: number): ImageResult {
    return {
      blob,
      name: withExtension(fileName, outExt),
      width,
      height,
      sourceWidth,
      sourceHeight,
      qualityUsed: Math.round(qualityUsed * 100),
      attempts,
    };
  }
}
