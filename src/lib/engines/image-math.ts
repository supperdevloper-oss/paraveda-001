/**
 * Pure geometry for the image engine.
 *
 * Everything here is deterministic, DOM-free and unit-tested. The main thread
 * computes an `ImagePlan` from the real decoded size of the image and then
 * hands that plan to whichever executor is available (an OffscreenCanvas Web
 * Worker, or the main-thread fallback). Keeping the maths out of the executor
 * means the logic exists exactly once.
 */

export type ResizeMode = 'keep' | 'width' | 'height' | 'both' | 'fit' | 'cover' | 'percent';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface ImagePlanOptions {
  resize: {
    mode: ResizeMode;
    width?: number;
    height?: number;
    percent?: number;
    /** Longest-edge cap applied after the mode, 0 = disabled. */
    maxDimension?: number;
  };
  /** Normalised crop rectangle (0..1 of the source). Omit or null for "whole image". */
  crop?: Rect | null;
  /** Rotation in degrees, clockwise. Any value; multiples of 90 take a fast path. */
  rotationDeg?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** CSS colour flattened behind the image, or null to keep transparency. */
  background?: string | null;
  /** Hard ceiling on either output dimension (browser canvas limits). */
  maxCanvasDimension?: number;
}

export interface ImagePlan {
  /** Source sub-rectangle, in source pixels. */
  crop: Rect;
  /** Progressive downscale steps ending at `resized`. */
  ladder: Size[];
  resized: Size;
  rotationDeg: number;
  flipX: boolean;
  flipY: boolean;
  /** Final canvas size, after rotation. */
  out: Size;
  background: string | null;
  /** True when the plan is a straight copy (no work to do beyond re-encoding). */
  isIdentity: boolean;
}

export const MAX_CANVAS_DIMENSION = 16384;

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Aspect-preserving size that fits inside the box. */
export function fitInside(src: Size, box: Size): Size {
  if (box.w <= 0 || box.h <= 0) return { ...src };
  const scale = Math.min(box.w / src.w, box.h / src.h);
  return {
    w: Math.max(1, Math.round(src.w * scale)),
    h: Math.max(1, Math.round(src.h * scale)),
  };
}

/** Aspect-preserving size that covers the box (overflow must be cropped). */
export function coverBox(src: Size, box: Size): Size {
  if (box.w <= 0 || box.h <= 0) return { ...src };
  const scale = Math.max(box.w / src.w, box.h / src.h);
  return {
    w: Math.max(1, Math.round(src.w * scale)),
    h: Math.max(1, Math.round(src.h * scale)),
  };
}

/** Crop rectangle that keeps the aspect ratio and centres the overflow. */
export function centerCropRect(src: Size, box: Size): Rect {
  const srcRatio = src.w / src.h;
  const boxRatio = box.w / box.h;
  if (Math.abs(srcRatio - boxRatio) < 1e-6) return { x: 0, y: 0, w: src.w, h: src.h };
  if (srcRatio > boxRatio) {
    const w = Math.round(src.h * boxRatio);
    return { x: Math.round((src.w - w) / 2), y: 0, w, h: src.h };
  }
  const h = Math.round(src.w / boxRatio);
  return { x: 0, y: Math.round((src.h - h) / 2), w: src.w, h };
}

/**
 * Build the progressive downscale ladder.
 *
 * Halving before the final draw avoids the aliasing and "thin line disappears"
 * artefacts that a single large drawImage reduction produces. Upscaling is done
 * in one step because there is nothing to preserve.
 */
export function buildLadder(from: Size, to: Size): Size[] {
  const ladder: Size[] = [];
  const ratio = Math.max(to.w / from.w, to.h / from.h);
  if (ratio >= 0.5 || ratio >= 1) {
    if (to.w !== from.w || to.h !== from.h) ladder.push({ ...to });
    return ladder;
  }
  let cur = { ...from };
  while (cur.w / 2 > to.w && cur.h / 2 > to.h) {
    cur = { w: Math.max(to.w, Math.round(cur.w / 2)), h: Math.max(to.h, Math.round(cur.h / 2)) };
    ladder.push({ ...cur });
  }
  if (cur.w !== to.w || cur.h !== to.h) ladder.push({ ...to });
  return ladder;
}

export function rotationBounds(src: Size, deg: number): Size {
  const norm = ((deg % 360) + 360) % 360;
  const snapped = Math.round(norm);
  if (isAxisRotation(norm)) {
    return snapped === 90 || snapped === 270 ? { w: src.h, h: src.w } : { ...src };
  }
  const rad = (norm * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    w: Math.max(1, Math.ceil(src.w * cos + src.h * sin)),
    h: Math.max(1, Math.ceil(src.w * sin + src.h * cos)),
  };
}

export function isAxisRotation(deg: number): boolean {
  const norm = ((deg % 360) + 360) % 360;
  return Math.abs(norm - Math.round(norm)) < 1e-6 && Math.round(norm) % 90 === 0;
}

/** Resolve the target size for a resize mode. */
export function resolveResize(src: Size, resize: ImagePlanOptions['resize']): Size {
  const mode = resize.mode ?? 'keep';
  let target: Size = { ...src };
  const w = Math.max(1, Math.round(resize.width || 0));
  const h = Math.max(1, Math.round(resize.height || 0));
  const p = Math.max(1, Math.round(resize.percent || 100));

  switch (mode) {
    case 'width':
      if (w > 0) target = { w, h: Math.max(1, Math.round((src.h * w) / src.w)) };
      break;
    case 'height':
      if (h > 0) target = { w: Math.max(1, Math.round((src.w * h) / src.h)), h };
      break;
    case 'both':
      if (w > 0 && h > 0) target = { w, h };
      break;
    case 'fit':
      if (w > 0 && h > 0) target = fitInside(src, { w, h });
      break;
    case 'percent':
      if (p > 0 && p !== 100) target = { w: Math.max(1, Math.round((src.w * p) / 100)), h: Math.max(1, Math.round((src.h * p) / 100)) };
      break;
    case 'cover':
    case 'keep':
    default:
      target = { ...src };
      break;
  }

  const cap = Math.max(0, Math.round(resize.maxDimension || 0));
  if (cap > 0 && Math.max(target.w, target.h) > cap) {
    target = fitInside(target, { w: cap, h: cap });
  }
  return target;
}

/**
 * Turn an image's real pixel size plus the user's options into an executable plan.
 * Throws a descriptive Error when the request cannot be satisfied.
 */
export function computeImagePlan(sourceW: number, sourceH: number, options: ImagePlanOptions): ImagePlan {
  if (!Number.isFinite(sourceW) || !Number.isFinite(sourceH) || sourceW < 1 || sourceH < 1) {
    throw new Error('The image could not be decoded — it may be corrupted or truncated.');
  }
  const src: Size = { w: Math.round(sourceW), h: Math.round(sourceH) };

  // --- 1. crop -------------------------------------------------------------
  let crop: Rect = { x: 0, y: 0, w: src.w, h: src.h };
  const rawCrop = options.crop;
  if (rawCrop && rawCrop.w > 0 && rawCrop.h > 0) {
    const x = clampInt(rawCrop.x * src.w, 0, src.w - 1);
    const y = clampInt(rawCrop.y * src.h, 0, src.h - 1);
    const w = clampInt(rawCrop.w * src.w, 1, src.w - x);
    const h = clampInt(rawCrop.h * src.h, 1, src.h - y);
    crop = { x, y, w, h };
  } else if (options.resize.mode === 'cover' && (options.resize.width || 0) > 0 && (options.resize.height || 0) > 0) {
    crop = centerCropRect(src, { w: Math.max(1, options.resize.width!), h: Math.max(1, options.resize.height!) });
  }

  const cropped: Size = { w: crop.w, h: crop.h };

  // --- 2. resize -----------------------------------------------------------
  const target = resolveResize(cropped, options.resize);
  // `cover` mode resizes the *cropped* region so that it exactly fills the box.
  const resized: Size =
    options.resize.mode === 'cover' && (options.resize.width || 0) > 0 && (options.resize.height || 0) > 0
      ? { w: Math.max(1, Math.round(options.resize.width!)), h: Math.max(1, Math.round(options.resize.height!)) }
      : target;
  const ladder = buildLadder(cropped, resized);

  // --- 3. rotate / flip ----------------------------------------------------
  const rotationDeg = Number.isFinite(options.rotationDeg ?? 0) ? (options.rotationDeg ?? 0) : 0;
  const flipX = !!options.flipX;
  const flipY = !!options.flipY;
  const out = rotationBounds(resized, rotationDeg);

  // --- 4. guard against browser canvas limits ------------------------------
  const ceiling = Math.min(options.maxCanvasDimension ?? MAX_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION);
  if (out.w > ceiling || out.h > ceiling) {
    throw new Error(
      `The result would be ${out.w} × ${out.h} px, which is larger than the ${ceiling} px canvas limit of this browser. Reduce the output size and try again.`,
    );
  }
  // Safari and most phones have a much lower *area* ceiling than the per-side one.
  const area = out.w * out.h;
  if (area > 268_435_456) {
    throw new Error(
      `The result would need ${Math.round(area / 1e6)} megapixels, which exceeds what a browser canvas can allocate. Reduce the output dimensions.`,
    );
  }

  const isIdentity =
    crop.x === 0 &&
    crop.y === 0 &&
    crop.w === src.w &&
    crop.h === src.h &&
    resized.w === src.w &&
    resized.h === src.h &&
    ladder.length === 0 &&
    rotationDeg === 0 &&
    !flipX &&
    !flipY;

  return {
    crop,
    ladder,
    resized,
    rotationDeg,
    flipX,
    flipY,
    out,
    background: options.background ?? null,
    isIdentity,
  };
}

/**
 * Binary-search state machine for target-size compression.
 * `fit` is true when the last encoded attempt was at or below the target.
 */
export interface QualitySearchState {
  lo: number;
  hi: number;
  best: { quality: number; size: number } | null;
  iterations: number;
  maxIterations: number;
}

export function startQualitySearch(min = 0.3, max = 0.95, maxIterations = 7): QualitySearchState {
  return { lo: min, hi: max, best: null, iterations: 0, maxIterations };
}

export function nextQualityProbe(state: QualitySearchState): number {
  return Math.round(((state.lo + state.hi) / 2) * 100) / 100;
}

/** Feed a measured result back in; returns the next probe or null when converged. */
export function recordQualityProbe(
  state: QualitySearchState,
  quality: number,
  size: number,
  targetBytes: number,
): QualitySearchState {
  const next: QualitySearchState = { ...state, iterations: state.iterations + 1 };
  if (size <= targetBytes) {
    if (!next.best || size > next.best.size) next.best = { quality, size };
    next.lo = quality;
  } else {
    next.hi = quality;
  }
  return next;
}

export function qualitySearchConverged(state: QualitySearchState): boolean {
  return state.iterations >= state.maxIterations || state.hi - state.lo <= 0.02;
}
