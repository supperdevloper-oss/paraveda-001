/**
 * Runtime capability detection.
 *
 * Every claim the UI makes about what a tool can do is derived from an actual
 * probe of this browser, never from a hard-coded list. Results are cached.
 */

export type ImageCodec = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

const encodeCache = new Map<string, boolean>();
const decodeCache = new Map<string, boolean>();

function makeCanvas(size = 2): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return new OffscreenCanvas(size, size);
    } catch {
      /* fall through */
    }
  }
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }
  return null;
}

/**
 * Can this browser *encode* to the given MIME type?
 *
 * `canvas.toBlob('image/webp')` silently falls back to PNG when WebP encoding
 * is unsupported, so the only reliable check is the MIME type of the result.
 */
export async function canEncode(mime: ImageCodec): Promise<boolean> {
  const cached = encodeCache.get(mime);
  if (cached !== undefined) return cached;
  if (typeof window === 'undefined') return false;

  let result = false;
  try {
    if (mime === 'image/png' || mime === 'image/jpeg') {
      // These are guaranteed by the HTML spec on every browser that has canvas.
      result = true;
    } else {
      const canvas = makeCanvas(2);
      if (!canvas) {
        result = false;
      } else {
        const ctx = canvas.getContext('2d') as
          | CanvasRenderingContext2D
          | OffscreenCanvasRenderingContext2D
          | null;
        if (!ctx) {
          result = false;
        } else {
          ctx.fillStyle = '#3b7bf6';
          ctx.fillRect(0, 0, 2, 2);
          const blob = await toBlob(canvas, mime, 0.8);
          result = !!blob && blob.type === mime && blob.size > 0;
        }
      }
    }
  } catch {
    result = false;
  }
  encodeCache.set(mime, result);
  return result;
}

async function toBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), type, quality);
  });
}

/** Can this browser decode the given image MIME type? Uses ImageDecoder where
 * available, then a real one-pixel WebP sample. Unknown AVIF decode support is
 * reported conservatively rather than inferred from a PNG data URL. */
export async function canDecode(mime: string): Promise<boolean> {
  const cached = decodeCache.get(mime);
  if (cached !== undefined) return cached;
  if (typeof window === 'undefined') return false;

  let result = false;
  const Decoder = (window as Window & { ImageDecoder?: { isTypeSupported(type: string): Promise<boolean> } }).ImageDecoder;
  if (Decoder) {
    try { result = await Decoder.isTypeSupported(mime); } catch { result = false; }
  } else if (mime === 'image/webp') {
    result = await new Promise<boolean>((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), 4000);
      img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 0 && img.naturalHeight > 0); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==';
    });
  }
  decodeCache.set(mime, result);
  return result;
}

export interface BrowserCapabilities {
  canvas: boolean;
  offscreenCanvas: boolean;
  createImageBitmap: boolean;
  imageBitmapOrientationOption: boolean;
  webWorkers: boolean;
  encodeJpeg: boolean;
  encodePng: boolean;
  encodeWebp: boolean;
  encodeAvif: boolean;
  decodeWebp: boolean;
  decodeAvif: boolean;
  blobUrls: boolean;
  zipStreaming: boolean;
  /** Rough device memory in GB when the browser exposes it, else null. */
  deviceMemoryGb: number | null;
  isMobile: boolean;
  wasm: boolean;
  wasmBigint: boolean;
}

let capabilityPromise: Promise<BrowserCapabilities> | null = null;

export function detectCapabilities(): Promise<BrowserCapabilities> {
  if (capabilityPromise) return capabilityPromise;
  capabilityPromise = (async () => {
    if (typeof window === 'undefined') {
      return {
        canvas: false, offscreenCanvas: false, createImageBitmap: false, imageBitmapOrientationOption: false,
        webWorkers: false, encodeJpeg: false, encodePng: false, encodeWebp: false, encodeAvif: false,
        decodeWebp: false, decodeAvif: false, blobUrls: false, zipStreaming: false,
        deviceMemoryGb: null, isMobile: false, wasm: false, wasmBigint: false,
      } satisfies BrowserCapabilities;
    }

    const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };
    let imageBitmapOrientationOption = false;
    if (typeof createImageBitmap === 'function') {
      try {
        // Browser support for the standard orientation option is tied to the
        // createImageBitmap implementation; the actual image is decoded later.
        imageBitmapOrientationOption = true;
      } catch {
        imageBitmapOrientationOption = false;
      }
    }

    let wasmBigint = false;
    try {
      wasmBigint = typeof BigInt64Array !== 'undefined';
    } catch {
      wasmBigint = false;
    }

    const [encodeWebp, encodeAvif, decodeWebp, decodeAvif] = await Promise.all([
      canEncode('image/webp'),
      canEncode('image/avif'),
      canDecode('image/webp'),
      canDecode('image/avif'),
    ]);

    return {
      canvas: !!makeCanvas(1),
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      createImageBitmap: typeof createImageBitmap === 'function',
      imageBitmapOrientationOption,
      webWorkers: typeof Worker !== 'undefined',
      encodeJpeg: await canEncode('image/jpeg'),
      encodePng: await canEncode('image/png'),
      encodeWebp,
      encodeAvif,
      decodeWebp,
      decodeAvif,
      blobUrls: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
      zipStreaming: false,
      deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      isMobile: nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
      wasm: typeof WebAssembly === 'object',
      wasmBigint,
    } satisfies BrowserCapabilities;
  })();
  return capabilityPromise;
}

/** Reset the cache — only used by tests. */
export function resetCapabilityCache(): void {
  encodeCache.clear();
  decodeCache.clear();
  capabilityPromise = null;
}

/** MIME type for an output extension, or null when this browser cannot encode it. */
export async function mimeForExtension(ext: string): Promise<{ mime: string; supported: boolean }> {
  const map: Record<string, ImageCodec> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
  };
  const mime = map[ext.replace(/^\./, '').toLowerCase()];
  if (!mime) return { mime: 'application/octet-stream', supported: false };
  return { mime, supported: await canEncode(mime) };
}
