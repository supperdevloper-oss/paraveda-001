/** In-browser audio/video conversions using the locally vendored ffmpeg.wasm. */
import { FFmpeg } from './ffmpeg-client';
import { baseName, extOf } from '../utils/format';
import { LIMITS } from '../tools/shared';
import { SITE } from '../site-config';
import { buildMediaCommand, type Settings } from './media-args';

export interface MediaHooks {
  signal?: { cancelled: boolean };
  onProgress?: (info: { label: string; ratio: number | null }) => void;
}
export interface MediaOutput { name: string; blob: Blob; size: number }

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let logBuffer = '';

function asset(path: string): string {
  const base = typeof location !== 'undefined' ? location.origin : 'http://localhost';
  return new URL(`/vendor/ffmpeg/${path}`, base).toString();
}

async function getFFmpeg(hooks?: MediaHooks): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loading) return loading;
  loading = (async () => {
    hooks?.onProgress?.({ label: 'Loading the in-browser media engine (about 32 MB)…', ratio: null });
    const instance = new FFmpeg();
    instance.on('log', ({ message }) => { logBuffer += `${message}\n`; });
    instance.on('progress', ({ progress, time }) => {
      // FFmpeg's own progress is used only after a duration probe. This callback
      // is surfaced as indeterminate until the current operation sets duration.
      if (typeof progress === 'number' && Number.isFinite(progress) && progress > 0) {
        hooks?.onProgress?.({ label: 'Processing media…', ratio: Math.min(0.99, progress) });
      } else if (time) {
        hooks?.onProgress?.({ label: 'Processing media…', ratio: null });
      }
    });
    await instance.load({
      classWorkerURL: asset('esm/worker.js'),
      coreURL: asset('core/ffmpeg-core.js'),
      wasmURL: asset('core/ffmpeg-core.wasm'),
    });
    ffmpeg = instance;
    return instance;
  })();
  try { return await loading; } finally { loading = null; }
}

function cancelled(hooks?: MediaHooks): void {
  if (hooks?.signal?.cancelled) throw Object.assign(new Error('Cancelled.'), { code: 'cancelled' });
}

function safeInputName(file: File): string {
  const ext = extOf(file.name).replace(/^\./, '').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  return `input.${ext}`;
}

function durationFromLog(text: string): number | null {
  const match = text.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

async function probe(ff: FFmpeg, input: string): Promise<number | null> {
  logBuffer = '';
  // Asking ffmpeg to open an input with no output prints the stream headers and
  // exits immediately. Do not use `-f null -` here: that decodes the entire
  // source a second time just to learn its duration.
  try { await ff.exec(['-hide_banner', '-i', input], 10_000); } catch { /* expected: no output stream */ }
  return durationFromLog(logBuffer);
}

function progressForDuration(ff: FFmpeg, duration: number | null, hooks?: MediaHooks) {
  if (!duration) return () => {};
  const callback = ({ time }: { time?: number }) => {
    if (typeof time === 'number' && Number.isFinite(time)) {
      const seconds = time > 100_000 ? time / 1_000_000 : time;
      hooks?.onProgress?.({ label: 'Processing media…', ratio: Math.max(0, Math.min(0.99, seconds / duration)) });
    }
  };
  ff.on('progress', callback);
  return () => ff.off('progress', callback);
}

function outputName(input: File, slug: string, ext: string): string {
  const stem = baseName(input.name) || 'converted';
  return `${stem}.${ext}`;
}

export async function convertMedia(
  input: File,
  slug: string,
  settings: Settings = {},
  hooks?: MediaHooks,
): Promise<MediaOutput[]> {
  const limit = slug === 'video-compressor' || slug === 'video-to-gif' || slug === 'mov-to-mp4'
    ? LIMITS.media : LIMITS.media;
  if (input.size > limit) throw new Error(`This file is ${Math.ceil(input.size / 1024 / 1024)} MB, above the ${Math.floor(limit / 1024 / 1024)} MB in-browser media limit. Try a smaller file or split it first.`);
  cancelled(hooks);
  const ff = await getFFmpeg(hooks);
  cancelled(hooks);
  const inName = safeInputName(input);
  const written = new Set<string>([inName]);
  const outputs = new Set<string>();
  try {
    hooks?.onProgress?.({ label: 'Reading media…', ratio: null });
    await ff.writeFile(inName, new Uint8Array(await input.arrayBuffer()));
    cancelled(hooks);
    const duration = await probe(ff, inName);
    const command = buildMediaCommand(slug, inName, settings);
    command.passes.forEach((pass) => pass.outputs.forEach((name) => outputs.add(name)));
    command.intermediates.forEach((name) => written.add(name));

    const removeProgress = progressForDuration(ff, duration, hooks);
    try {
      for (let i = 0; i < command.passes.length; i += 1) {
        cancelled(hooks);
        hooks?.onProgress?.({ label: command.passes.length > 1 ? `Encoding pass ${i + 1} of ${command.passes.length}…` : 'Encoding…', ratio: duration ? null : null });
        const code = await ff.exec(command.passes[i]!.args, SITE.limits.mediaJobTimeoutMs);
        if (code !== 0) {
          const tail = logBuffer.trim().split('\n').slice(-4).join(' ');
          throw new Error(tail || `The media encoder stopped with code ${code}. The file may use an unsupported codec.`);
        }
      }
    } finally { removeProgress(); }

    const result: MediaOutput[] = [];
    for (const fileName of command.outputs) {
      cancelled(hooks);
      const data = await ff.readFile(fileName);
      if (typeof data === 'string' || data.length === 0) throw new Error('The media engine produced an empty output file.');
      const ext = fileName.split('.').pop() || 'bin';
      const blob = new Blob([Uint8Array.from(data as Uint8Array).buffer], { type: mimeFor(ext) });
      result.push({ name: outputName(input, slug, ext), blob, size: blob.size });
    }
    hooks?.onProgress?.({ label: 'Complete', ratio: 1 });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (/memory|allocation|out of memory/i.test(error.message)) {
      throw new Error('This file exceeded the memory available to your browser. Close other tabs or try a smaller file. Media processing can require several times the input file size in memory.');
    }
    if (/abort/i.test(error.message) && hooks?.signal?.cancelled) throw Object.assign(new Error('Cancelled.'), { code: 'cancelled' });
    throw error;
  } finally {
    for (const name of new Set([...written, ...outputs])) {
      try { await ff.deleteFile(name); } catch { /* file may not exist */ }
    }
  }
}

function mimeFor(ext: string): string {
  return ({ mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif', opus: 'audio/opus', ogg: 'audio/ogg', m4a: 'audio/mp4' } as Record<string, string>)[ext] ?? 'application/octet-stream';
}

/** Stop ffmpeg and release its WASM memory; next operation will reload it. */
export async function disposeMediaEngine(): Promise<void> {
  if (loading) { try { await loading; } catch { /* ignore */ } }
  ffmpeg?.terminate();
  ffmpeg = null;
  loading = null;
}

export const MEDIA_FILE_LIMIT_BYTES = LIMITS.media;
