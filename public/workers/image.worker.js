/**
 * ConvertFlow image executor — OffscreenCanvas Web Worker.
 *
 * Plain JavaScript on purpose: it lives in `public/` so it is served verbatim,
 * which keeps it independent of the app bundler and works identically in `dev`
 * and in a static export on shared hosting.
 *
 * The worker is deliberately dumb. All decisions (crop rect, resize ladder,
 * rotation bounds, quality search) are made on the main thread by the pure,
 * unit-tested maths in `src/lib/engines/image-math.ts`. This file only executes
 * a serialised plan, which is why the logic exists exactly once in the project.
 *
 * Protocol
 *   -> { type:'prepare', sessionId, bitmap }            (bitmap is transferred)
 *   <- { type:'prepared', sessionId, width, height }
 *   -> { type:'encode',  sessionId, jobId, plan, mime, quality }
 *   <- { type:'encoded', jobId, blob, width, height }   | { type:'error', jobId, message }
 *   -> { type:'release', sessionId }
 *   -> { type:'ping' }   <- { type:'pong' }
 */

/* global self, OffscreenCanvas */

const sessions = new Map();
const cancelled = new Set();

function post(message, transfer) {
  self.postMessage(message, transfer || []);
}

function fail(jobId, err) {
  post({
    type: 'error',
    jobId,
    message: err && err.message ? String(err.message) : 'The image could not be processed in the worker.',
  });
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas is not available in this browser.');
  return new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function ctx2d(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
  if (!ctx) throw new Error('The browser refused to create a 2D drawing context.');
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Yield to the worker event loop so cancel messages are handled. */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function drawSource(target, source, sx, sy, sw, sh, dx, dy, dw, dh) {
  const ctx = ctx2d(target);
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
  return target;
}

async function encodePlan(sessionId, plan, mime, quality) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('This image session has already been released.');
  const bitmap = session.bitmap;

  // --- 1. crop -------------------------------------------------------------
  let current = bitmap;
  let currentW = plan.crop.w;
  let currentH = plan.crop.h;
  const isFullSource =
    plan.crop.x === 0 && plan.crop.y === 0 && plan.crop.w === bitmap.width && plan.crop.h === bitmap.height;

  if (!isFullSource) {
    const cropCanvas = makeCanvas(plan.crop.w, plan.crop.h);
    drawSource(cropCanvas, bitmap, plan.crop.x, plan.crop.y, plan.crop.w, plan.crop.h, 0, 0, plan.crop.w, plan.crop.h);
    current = cropCanvas;
  } else {
    currentW = bitmap.width;
    currentH = bitmap.height;
  }

  // --- 2. progressive downscale -------------------------------------------
  for (const step of plan.ladder) {
    if (cancelled.has(sessionId)) throw new Error('cancelled');
    const next = makeCanvas(step.w, step.h);
    drawSource(next, current, 0, 0, currentW, currentH, 0, 0, step.w, step.h);
    current = next;
    currentW = step.w;
    currentH = step.h;
    await tick();
  }

  // --- 3. rotate / flip ----------------------------------------------------
  const deg = ((plan.rotationDeg % 360) + 360) % 360;
  const axis = Math.abs(deg - Math.round(deg)) < 1e-6 && Math.round(deg) % 90 === 0;
  const out = makeCanvas(plan.out.w, plan.out.h);
  const outCtx = ctx2d(out);

  if (plan.background) {
    outCtx.fillStyle = plan.background;
    outCtx.fillRect(0, 0, plan.out.w, plan.out.h);
  }

  outCtx.save();
  outCtx.translate(plan.out.w / 2, plan.out.h / 2);

  if (plan.flipX) outCtx.scale(-1, 1);
  if (plan.flipY) outCtx.scale(1, -1);

  if (axis) {
    const snapped = Math.round(deg);
    if (snapped) outCtx.rotate((snapped * Math.PI) / 180);
    outCtx.drawImage(current, -currentW / 2, -currentH / 2, currentW, currentH);
  } else {
    if (deg) outCtx.rotate((deg * Math.PI) / 180);
    outCtx.drawImage(current, -currentW / 2, -currentH / 2, currentW, currentH);
  }
  outCtx.restore();

  await tick();
  if (cancelled.has(sessionId)) throw new Error('cancelled');

  // --- 4. encode -----------------------------------------------------------
  const blob = await out.convertToBlob({
    type: mime,
    quality: mime === 'image/png' ? undefined : Math.max(0.01, Math.min(1, quality)),
  });
  if (!blob || blob.size === 0) throw new Error('The browser produced an empty file for this format.');
  // Safari sometimes ignores an unsupported type and returns PNG instead.
  if (blob.type && blob.type !== mime && mime !== 'image/png') {
    throw new Error(
      'This browser cannot write ' + mime + ' files. Choose a different output format.',
    );
  }

  return { blob, width: plan.out.w, height: plan.out.h };
}

self.onmessage = async (event) => {
  const msg = event.data || {};

  switch (msg.type) {
    case 'ping':
      post({ type: 'pong' });
      return;

    case 'prepare': {
      const bitmap = msg.bitmap;
      if (!bitmap) {
        post({ type: 'error', jobId: msg.sessionId, message: 'No image data reached the worker.' });
        return;
      }
      sessions.set(msg.sessionId, { bitmap });
      cancelled.delete(msg.sessionId);
      post({ type: 'prepared', sessionId: msg.sessionId, width: bitmap.width, height: bitmap.height });
      return;
    }

    case 'encode': {
      try {
        const result = await encodePlan(msg.sessionId, msg.plan, msg.mime, msg.quality);
        post({ type: 'encoded', jobId: msg.jobId, blob: result.blob, width: result.width, height: result.height });
      } catch (err) {
        if (err && err.message === 'cancelled') post({ type: 'cancelled', jobId: msg.jobId });
        else fail(msg.jobId, err);
      }
      return;
    }

    case 'cancel':
      cancelled.add(msg.sessionId);
      return;

    case 'release': {
      const session = sessions.get(msg.sessionId);
      if (session && session.bitmap && typeof session.bitmap.close === 'function') session.bitmap.close();
      sessions.delete(msg.sessionId);
      cancelled.delete(msg.sessionId);
      return;
    }

    default:
      return;
  }
};

self.onerror = (event) => {
  post({ type: 'worker-error', message: event && event.message ? event.message : 'Worker crashed' });
};
