/**
 * ffmpeg command construction.
 *
 * Pure functions only — no ffmpeg, no DOM — so every command line this site
 * runs can be asserted in a unit test before it ever touches a user's file.
 *
 * Encoders available in the bundled @ffmpeg/core 0.12.10 (verified against its
 * configure flags): libx264, libx265, libvpx (VP8/VP9), libmp3lame, libopus,
 * libvorbis, libtheora, libwebp, plus the native AAC and GIF encoders and the
 * palettegen / paletteuse filters.
 */

export type Settings = Record<string, string | number | boolean>;

export interface MediaCommand {
  /** File name to write into the virtual FS before running. */
  inputName: string;
  /** One or more sequential command lines (GIF needs two passes). */
  passes: { args: string[]; outputs: string[] }[];
  /** Files to read back out of the virtual FS, in order. */
  outputs: string[];
  /** Extra files created as intermediates, deleted afterwards. */
  intermediates: string[];
}

const s = (v: Settings, key: string, fallback: string | number): string | number => {
  const value = v[key];
  if (value === undefined || value === null || value === '') return fallback;
  return typeof value === 'boolean' ? String(value) : value;
};

const num = (v: Settings, key: string, fallback: number): number => {
  const n = Number(s(v, key, fallback));
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: Settings, key: string, fallback: string): string => String(s(v, key, fallback));

/** "10,45" -> { start: 10, end: 45 } | null */
export function parseSegment(value: unknown): { start?: number; end?: number } | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const parts = text.split(',').map((p) => p.trim());
  const start = parts[0] ? Number(parts[0]) : NaN;
  const end = parts.length > 1 && parts[1] ? Number(parts[1]) : NaN;
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  const out: { start?: number; end?: number } = {};
  if (!Number.isNaN(start) && start >= 0) out.start = start;
  if (!Number.isNaN(end) && end > 0) out.end = end;
  if (out.start !== undefined && out.end !== undefined && out.end <= out.start) return null;
  return Object.keys(out).length ? out : null;
}

/** Input-seeking flags. Placed before -i so ffmpeg skips instead of decoding. */
export function seekArgs(segment: { start?: number; end?: number } | null): string[] {
  if (!segment) return [];
  const args: string[] = [];
  if (segment.start) args.push('-ss', String(segment.start));
  if (segment.end) {
    const duration = segment.start ? segment.end - segment.start : segment.end;
    if (duration > 0) args.push('-t', String(Math.round(duration * 1000) / 1000));
  }
  return args;
}

/** x264/VP9 scale filter that caps the height and keeps even dimensions. */
export function heightCapFilter(maxHeight: number): string | null {
  if (!maxHeight || maxHeight <= 0) return null;
  return `scale=-2:min(ih\\,${Math.round(maxHeight)})`;
}

export function fpsFilter(fps: number): string | null {
  if (!fps || fps <= 0) return null;
  return `fps=${Math.round(fps)}`;
}

function joinFilters(filters: (string | null)[]): string | null {
  const real = filters.filter((f): f is string => !!f);
  return real.length ? real.join(',') : null;
}

/* -------------------------------------------------------------------------- */

export function buildMp4ToMp3(inputName: string, v: Settings): MediaCommand {
  const out = 'output.mp3';
  const args: string[] = [];
  args.push(...seekArgs(parseSegment(s(v, 'trim', ''))));
  args.push('-i', inputName, '-vn', '-sn', '-dn', '-map', '0:a:0?');

  const mode = str(v, 'bitrateMode', 'vbr');
  args.push('-codec:a', 'libmp3lame');
  if (mode === 'vbr') args.push('-q:a', '2');
  else args.push('-b:a', `${Math.round(num(v, 'bitrateMode', 192))}k`);

  const sampleRate = num(v, 'sampleRate', 0);
  if (sampleRate > 0) args.push('-ar', String(sampleRate));
  const channels = str(v, 'channels', 'source');
  if (channels !== 'source') args.push('-ac', channels);

  args.push(out);
  return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
}

export function buildMovToMp4(inputName: string, v: Settings): MediaCommand {
  const out = 'output.mp4';
  const codec = str(v, 'videoCodec', 'h264');
  const args: string[] = ['-i', inputName];

  if (codec === 'copy') {
    args.push('-c', 'copy', '-movflags', '+faststart', out);
    return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
  }

  const crf = Math.min(51, Math.max(0, Math.round(num(v, 'crf', 23))));
  const preset = ['ultrafast', 'veryfast', 'fast', 'medium'].includes(str(v, 'preset', 'veryfast'))
    ? str(v, 'preset', 'veryfast')
    : 'veryfast';

  args.push('-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p');

  const vf = heightCapFilter(num(v, 'maxHeight', 0));
  if (vf) args.push('-vf', vf.replace('\\,', ','));

  const audioBitrate = str(v, 'audioBitrate', '160k');
  if (audioBitrate === 'copy') args.push('-c:a', 'copy');
  else args.push('-c:a', 'aac', '-b:a', audioBitrate);

  args.push('-movflags', '+faststart', out);
  return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
}

export function buildWavToMp3(inputName: string, v: Settings): MediaCommand {
  const out = 'output.mp3';
  const args: string[] = ['-i', inputName];
  const mode = str(v, 'bitrateMode', 'vbr');
  args.push('-codec:a', 'libmp3lame');
  if (mode === 'vbr') args.push('-q:a', '2');
  else args.push('-b:a', `${Math.round(num(v, 'bitrateMode', 192))}k`);

  const sampleRate = num(v, 'sampleRate', 0);
  if (sampleRate > 0) args.push('-ar', String(sampleRate));
  const channels = str(v, 'channels', 'source');
  if (channels !== 'source') args.push('-ac', channels);

  if (str(v, 'normalize', 'off') === 'loudnorm') args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
  args.push(out);
  return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
}

export function buildVideoCompressor(inputName: string, v: Settings): MediaCommand {
  const format = str(v, 'outputFormat', 'mp4') === 'webm' ? 'webm' : 'mp4';
  const out = `output.${format}`;
  const args: string[] = ['-i', inputName];
  const crf = Math.min(63, Math.max(0, Math.round(num(v, 'crf', 28))));
  const vf = joinFilters([heightCapFilter(num(v, 'maxHeight', 0))?.replace('\\,', ',') ?? null, fpsFilter(num(v, 'fps', 0))]);
  if (vf) args.push('-vf', vf);

  if (format === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2');
  } else {
    const preset = ['ultrafast', 'veryfast', 'fast'].includes(str(v, 'preset', 'veryfast')) ? str(v, 'preset', 'veryfast') : 'veryfast';
    args.push('-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p');
  }

  const audioBitrate = str(v, 'audioBitrate', '128k');
  if (audioBitrate === 'none') args.push('-an');
  else args.push('-c:a', format === 'webm' ? 'libopus' : 'aac', '-b:a', audioBitrate);

  if (format === 'mp4') args.push('-movflags', '+faststart');
  args.push(out);
  return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
}

const AUDIO_CODECS: Record<string, { codec: string; ext: string }> = {
  mp3: { codec: 'libmp3lame', ext: 'mp3' },
  opus: { codec: 'libopus', ext: 'opus' },
  ogg: { codec: 'libvorbis', ext: 'ogg' },
  m4a: { codec: 'aac', ext: 'm4a' },
};

export function buildAudioCompressor(inputName: string, v: Settings): MediaCommand {
  const chosen = AUDIO_CODECS[str(v, 'outputFormat', 'mp3')] ?? AUDIO_CODECS.mp3!;
  const out = `output.${chosen.ext}`;
  const args: string[] = ['-i', inputName, '-vn', '-sn', '-dn'];

  args.push('-c:a', chosen.codec);
  const bitrate = str(v, 'bitrate', '128k');
  if (chosen.codec === 'libmp3lame' && bitrate === 'vbr') args.push('-q:a', '2');
  else args.push('-b:a', bitrate);

  const channels = str(v, 'channels', 'source');
  if (channels !== 'source') args.push('-ac', channels);
  const sampleRate = num(v, 'sampleRate', 0);
  if (sampleRate > 0) args.push('-ar', String(sampleRate));
  if (str(v, 'normalize', 'off') === 'loudnorm') args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
  args.push(out);
  return { inputName, passes: [{ args, outputs: [out] }], outputs: [out], intermediates: [] };
}

export function buildVideoToGif(inputName: string, v: Settings): MediaCommand {
  const out = 'output.gif';
  const palette = 'palette.png';
  const fps = Math.max(1, Math.min(30, Math.round(num(v, 'fps', 12))));
  const width = Math.round(num(v, 'width', 480));
  const segment = parseSegment(s(v, 'segment', ''));
  const seek = seekArgs(segment);
  const loop = v.loop === false ? '-1' : '0';

  const scale = width > 0 ? `scale=${width}:-1:flags=lanczos` : 'scale=iw:ih:flags=lanczos';
  const baseChain = `fps=${fps},${scale}`;

  const twoPass = str(v, 'palette', 'high') === 'high';
  if (!twoPass) {
    return {
      inputName,
      passes: [{ args: [...seek, '-i', inputName, '-vf', baseChain, '-loop', loop, out], outputs: [out] }],
      outputs: [out],
      intermediates: [],
    };
  }

  return {
    inputName,
    passes: [
      {
        args: [...seek, '-i', inputName, '-vf', `${baseChain},palettegen=stats_mode=diff`, palette],
        outputs: [palette],
      },
      {
        args: [
          ...seek,
          '-i', inputName,
          '-i', palette,
          '-lavfi', `${baseChain}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
          '-loop', loop,
          out,
        ],
        outputs: [out],
      },
    ],
    outputs: [out],
    intermediates: [palette],
  };
}

const BUILDERS: Record<string, (inputName: string, v: Settings) => MediaCommand> = {
  'mp4-to-mp3': buildMp4ToMp3,
  'mov-to-mp4': buildMovToMp4,
  'wav-to-mp3': buildWavToMp3,
  'video-compressor': buildVideoCompressor,
  'audio-compressor': buildAudioCompressor,
  'video-to-gif': buildVideoToGif,
};

export function buildMediaCommand(slug: string, inputName: string, settings: Settings): MediaCommand {
  const builder = BUILDERS[slug];
  if (!builder) throw new Error(`No ffmpeg command is defined for "${slug}".`);
  return builder(inputName, settings);
}

export function hasMediaBuilder(slug: string): boolean {
  return slug in BUILDERS;
}

/** Human-readable command line, shown in the UI so nothing is a black box. */
export function describeCommand(command: MediaCommand): string {
  return command.passes.map((p) => `ffmpeg ${p.args.join(' ')}`).join('\n');
}
