import type { ToolDefinition } from './types';
import { LIMITS, ffmpegNotes, BROWSER_PROCESSING_NOTE } from './shared';

const VIDEO_ACCEPT = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', 'video/*'];
const AUDIO_ACCEPT = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.weba', 'audio/*'];

/**
 * Encoders verified against the bundled @ffmpeg/core 0.12.10 build flags:
 *   --enable-gpl --enable-libx264 --enable-libx265 --enable-libvpx
 *   --enable-libmp3lame --enable-libopus --enable-libvorbis --enable-libtheora
 *   --enable-libwebp --enable-libass --enable-libfreetype --enable-libzimg
 * The native AAC encoder and the GIF encoder (with palettegen/paletteuse) are
 * part of the same build. HEVC and ProRes sources cannot be *decoded*.
 */
const MEDIA_STEPS = [
  'Add the file. The first run downloads the 32 MB ffmpeg core once and your browser caches it.',
  'Set the options — the defaults are chosen to give a good result without any tuning.',
  'Press Convert and watch the real time-based progress, then download the output.',
];

export const MEDIA_TOOLS: ToolDefinition[] = [
  /* ------------------------------------------------------------- MP4 → MP3 */
  {
    slug: 'mp4-to-mp3',
    name: 'MP4 to MP3',
    title: 'MP4 to MP3 Converter — Extract Audio Free, No Upload | ConvertFlow',
    description:
      'Extract the audio track from an MP4 video and save it as MP3. Runs on ffmpeg in your browser: no upload, no sign-up, no watermark.',
    category: 'audio',
    kind: 'convert',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: [...VIDEO_ACCEPT, '.m4a'],
    inputFormats: ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.m4a'],
    outputFormats: ['mp3'],
    defaultOutput: 'mp3',
    maxInputBytes: LIMITS.media,
    maxFiles: 3,
    icon: 'music',
    tags: ['extract audio', 'video to audio', 'mp3', 'sound'],
    popular: true,
    settings: [
      {
        key: 'bitrateMode',
        label: 'Bitrate',
        type: 'select',
        default: 'vbr',
        group: 'Quality',
        options: [
          { value: 'vbr', label: 'Variable bitrate (VBR) — best quality per byte' },
          { value: '320', label: '320 kbps constant' },
          { value: '256', label: '256 kbps constant' },
          { value: '192', label: '192 kbps constant' },
          { value: '128', label: '128 kbps constant' },
          { value: '96', label: '96 kbps constant — speech only' },
        ],
        help: 'VBR uses the LAME -V scale (V2 ≈ 190 kbps average) and is the recommended default.',
      },
      {
        key: 'sampleRate',
        label: 'Sample rate',
        type: 'select',
        default: '0',
        group: 'Quality',
        options: [
          { value: '0', label: 'Keep the source rate' },
          { value: '48000', label: '48 kHz' },
          { value: '44100', label: '44.1 kHz (CD)' },
          { value: '22050', label: '22.05 kHz — smaller, speech' },
        ],
      },
      {
        key: 'channels',
        label: 'Channels',
        type: 'select',
        default: 'source',
        group: 'Quality',
        options: [
          { value: 'source', label: 'Keep the source layout' },
          { value: '2', label: 'Stereo' },
          { value: '1', label: 'Mono — halves the size, good for voice' },
        ],
      },
      {
        key: 'trim',
        label: 'Extract a segment',
        type: 'text',
        default: '',
        group: 'Output',
        help: 'Optional. Start and end in seconds separated by a comma, e.g. "10,45" extracts from 0:10 to 0:45. Leave empty for the whole track.',
      },
    ],
    steps: MEDIA_STEPS,
    notes: ffmpegNotes([
      'The video stream is discarded with -vn, so only the audio is decoded and re-encoded.',
      'DRM-protected or encrypted streams cannot be decoded by any tool, including this one.',
      'Conversion speed on a laptop is usually several times realtime; on a phone expect roughly realtime or slower.',
    ]),
    faq: [
      {
        q: 'Is the extracted MP3 the same quality as the video audio?',
        a: 'It is a re-encode, so strictly speaking there is a small additional loss. Most MP4 videos from phones and cameras already store audio as AAC at 128–256 kbps; converting that to MP3 at VBR V2 or 192 kbps and above is not audible in normal listening.',
      },
      {
        q: 'How long will it take?',
        a: 'ffmpeg.wasm runs single-threaded with no hardware acceleration. A one-minute clip typically takes a few seconds on a laptop and around a minute on a mid-range phone. The progress bar is driven by the actual media time processed, so it reflects reality.',
      },
      {
        q: 'Can I extract only part of the audio?',
        a: 'Yes. Use the "Extract a segment" field with start and end seconds, for example 10,45. Both numbers are read from the beginning of the file.',
      },
      {
        q: 'Does the video get uploaded?',
        a: `No. ${BROWSER_PROCESSING_NOTE}`,
      },
      {
        q: 'Why did my file fail with an out-of-memory error?',
        a: `The WebAssembly sandbox has roughly 2 GB of address space shared between the ffmpeg core, your input file and the output buffer. Very large videos exceed it. Keep inputs well under ${Math.round(LIMITS.media / 1048576)} MB and prefer a desktop browser for long recordings.`,
      },
    ],
    related: ['wav-to-mp3', 'audio-compressor', 'mov-to-mp4', 'video-to-gif'],
  },

  /* ------------------------------------------------------------- MOV → MP4 */
  {
    slug: 'mov-to-mp4',
    name: 'MOV to MP4',
    title: 'MOV to MP4 Converter — Free, In-Browser with ffmpeg | ConvertFlow',
    description:
      'Convert QuickTime MOV videos to MP4 (H.264 + AAC) for free in your browser. No upload, no watermarks, no account needed.',
    category: 'video',
    kind: 'convert',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: ['.mov', '.qt', 'video/quicktime', '.mp4'],
    inputFormats: ['.mov', '.qt'],
    outputFormats: ['mp4'],
    defaultOutput: 'mp4',
    maxInputBytes: LIMITS.media,
    maxFiles: 2,
    icon: 'video',
    tags: ['quicktime', 'h264', 'compatibility', 'iphone video'],
    popular: true,
    settings: [
      {
        key: 'videoCodec',
        label: 'Video codec',
        type: 'select',
        default: 'h264',
        group: 'Quality',
        options: [
          { value: 'h264', label: 'H.264 (libx264) — plays everywhere' },
          { value: 'copy', label: 'Copy the stream without re-encoding (only if the MOV already holds H.264)' },
        ],
        help: 'Copy mode is instant and lossless but only works when the source video stream is already MP4-compatible.',
      },
      {
        key: 'crf',
        label: 'Quality (CRF)',
        type: 'range',
        default: 23,
        min: 16,
        max: 34,
        step: 1,
        group: 'Quality',
        help: 'Lower is better quality and a bigger file. 18 is visually lossless, 23 is the x264 default, 28 is small and soft.',
      },
      {
        key: 'preset',
        label: 'Encoding speed',
        type: 'select',
        default: 'veryfast',
        group: 'Quality',
        options: [
          { value: 'ultrafast', label: 'Ultrafast — largest file, quickest' },
          { value: 'veryfast', label: 'Very fast — recommended for wasm' },
          { value: 'fast', label: 'Fast — better compression, slower' },
          { value: 'medium', label: 'Medium — noticeably slow in the browser' },
        ],
        help: 'Slower presets squeeze more quality out of the same bitrate, but ffmpeg.wasm is single-threaded, so the time cost is real.',
      },
      {
        key: 'maxHeight',
        label: 'Maximum height',
        type: 'select',
        default: '0',
        group: 'Transform',
        options: [
          { value: '0', label: 'Keep the original resolution' },
          { value: '2160', label: 'Scale down to 4K if larger' },
          { value: '1080', label: 'Scale down to 1080p if larger' },
          { value: '720', label: 'Scale down to 720p if larger' },
          { value: '480', label: 'Scale down to 480p if larger' },
        ],
      },
      {
        key: 'audioBitrate',
        label: 'Audio bitrate',
        type: 'select',
        default: '160k',
        group: 'Quality',
        options: [
          { value: 'copy', label: 'Copy the original audio stream' },
          { value: '192k', label: '192 kbps AAC' },
          { value: '160k', label: '160 kbps AAC' },
          { value: '128k', label: '128 kbps AAC' },
          { value: '96k', label: '96 kbps AAC' },
        ],
      },
    ],
    steps: MEDIA_STEPS,
    notes: ffmpegNotes([
      'MOV containers holding HEVC (H.265 from newer iPhones), ProRes or other Apple-only codecs cannot be decoded by this build and will fail with a clear message.',
      'The output is written with -movflags +faststart, so it starts streaming before it finishes downloading.',
      'Re-encoding video in the browser is the slowest thing this site does. Short clips are fine; long recordings should be handled on a desktop.',
    ]),
    faq: [
      {
        q: 'Why convert MOV to MP4 at all?',
        a: 'MOV and MP4 are closely related containers, but a lot of software — Windows tools, web upload forms, Android players, PowerPoint — only accepts the .mp4 wrapper. Converting removes that friction.',
      },
      {
        q: 'Can I convert without losing quality?',
        a: 'If your MOV already contains an H.264 video stream and AAC audio, choose "Copy the stream without re-encoding". That simply rewraps the data, is nearly instant, and is bit-for-bit identical. Otherwise re-encoding is unavoidable; use CRF 18–20 for a visually lossless result.',
      },
      {
        q: 'My iPhone video failed to convert. Why?',
        a: 'Recent iPhones record HEVC (H.265) by default. This browser build has no HEVC decoder, so those files cannot be processed here. On the iPhone, Settings → Camera → Formats → Most Compatible makes new recordings H.264.',
      },
      {
        q: 'How big a video can I convert?',
        a: `The hard input limit is ${Math.round(LIMITS.media / 1048576)} MB, but the practical limit is the ~2 GB WebAssembly address space shared by the core, the input and the output. In practice keep videos under about 300 MB and under a few minutes for a comfortable wait.`,
      },
    ],
    related: ['mp4-to-mp3', 'video-compressor', 'video-to-gif'],
  },

  /* ------------------------------------------------------------- WAV → MP3 */
  {
    slug: 'wav-to-mp3',
    name: 'WAV to MP3',
    title: 'WAV to MP3 Converter — Free Audio Conversion | ConvertFlow',
    description:
      'Convert uncompressed WAV audio to MP3 for free in your browser using ffmpeg. Choose the bitrate, sample rate and channel layout.',
    category: 'audio',
    kind: 'convert',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: ['.wav', '.wave', 'audio/wav', 'audio/x-wav'],
    inputFormats: ['.wav'],
    outputFormats: ['mp3'],
    defaultOutput: 'mp3',
    maxInputBytes: LIMITS.media,
    maxFiles: 5,
    icon: 'audio-lines',
    tags: ['wave', 'pcm', 'audio', 'encode', 'lame'],
    settings: [
      {
        key: 'bitrateMode',
        label: 'Bitrate',
        type: 'select',
        default: 'vbr',
        group: 'Quality',
        options: [
          { value: 'vbr', label: 'Variable bitrate (LAME V2, ≈190 kbps)' },
          { value: '320', label: '320 kbps constant' },
          { value: '256', label: '256 kbps constant' },
          { value: '192', label: '192 kbps constant' },
          { value: '128', label: '128 kbps constant' },
        ],
      },
      {
        key: 'sampleRate',
        label: 'Sample rate',
        type: 'select',
        default: '0',
        group: 'Quality',
        options: [
          { value: '0', label: 'Keep the source rate' },
          { value: '48000', label: '48 kHz' },
          { value: '44100', label: '44.1 kHz' },
        ],
      },
      {
        key: 'channels',
        label: 'Channels',
        type: 'select',
        default: 'source',
        group: 'Quality',
        options: [
          { value: 'source', label: 'Keep the source layout' },
          { value: '2', label: 'Stereo' },
          { value: '1', label: 'Mono' },
        ],
      },
      {
        key: 'normalize',
        label: 'Loudness',
        type: 'select',
        default: 'off',
        group: 'Quality',
        options: [
          { value: 'off', label: 'Leave the level untouched' },
          { value: 'loudnorm', label: 'Normalise to broadcast loudness (EBU R128)' },
        ],
        help: 'Normalisation runs ffmpeg loudnorm. It changes the level of the whole track, not just the peaks.',
      },
    ],
    steps: MEDIA_STEPS,
    notes: ffmpegNotes([
      'Encoding uses LAME (libmp3lame), the reference MP3 encoder, compiled into the browser build.',
      'WAV is uncompressed PCM, so the size reduction is large and predictable: 320 kbps MP3 is roughly one fifth of 16-bit 44.1 kHz stereo.',
      '24-bit and 32-bit float WAV files are supported and are dithered down by the encoder.',
    ]),
    faq: [
      {
        q: 'How much smaller will the MP3 be?',
        a: 'A CD-quality WAV (16-bit, 44.1 kHz, stereo) is about 10 MB per minute. At 192 kbps the MP3 is about 1.4 MB per minute — roughly an 86 % reduction. At VBR V2 expect something similar.',
      },
      {
        q: 'Which bitrate should I pick?',
        a: 'VBR (the default) or 192 kbps for music, 128 kbps or mono for voice recordings and podcasts, 320 kbps if you are archiving and disk space is not a concern.',
      },
      {
        q: 'Is any quality lost?',
        a: 'Yes, MP3 is lossy by definition. The perceptual encoder removes content that is masked by louder neighbouring sounds. At 192 kbps and above this is not audible for most people on most material, but the WAV remains the better archive format.',
      },
      {
        q: 'Can I batch convert several WAV files?',
        a: `Yes, up to ${5} files per run. They are processed one after another — the browser sandbox cannot run two ffmpeg instances at once — and the results are delivered together as a ZIP.`,
      },
    ],
    related: ['mp4-to-mp3', 'audio-compressor'],
  },

  /* ------------------------------------------------------- Video compressor */
  {
    slug: 'video-compressor',
    name: 'Video Compressor',
    title: 'Video Compressor — Reduce MP4 Size Free In-Browser | ConvertFlow',
    description:
      'Shrink MP4, MOV and WebM videos in your browser with ffmpeg and libx264. CRF, preset and resolution control, no upload.',
    category: 'video',
    kind: 'compress',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: VIDEO_ACCEPT,
    inputFormats: ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'],
    outputFormats: ['mp4', 'webm'],
    defaultOutput: 'mp4',
    maxInputBytes: LIMITS.media,
    maxFiles: 2,
    icon: 'minimize',
    tags: ['reduce video size', 'compress mp4', 'crf', 'shrink'],
    settings: [
      {
        key: 'outputFormat',
        label: 'Container',
        type: 'select',
        default: 'mp4',
        group: 'Output',
        options: [
          { value: 'mp4', label: 'MP4 (H.264 + AAC) — most compatible' },
          { value: 'webm', label: 'WebM (VP9 + Opus) — smaller, slower to encode' },
        ],
      },
      {
        key: 'crf',
        label: 'Quality (CRF)',
        type: 'range',
        default: 28,
        min: 18,
        max: 40,
        step: 1,
        group: 'Quality',
        help: 'This is the main size/quality dial. 23 looks like the source, 28 is a good compromise for sharing, 34 is small and visibly soft.',
      },
      {
        key: 'preset',
        label: 'Encoding speed',
        type: 'select',
        default: 'veryfast',
        group: 'Quality',
        options: [
          { value: 'ultrafast', label: 'Ultrafast' },
          { value: 'veryfast', label: 'Very fast — recommended' },
          { value: 'fast', label: 'Fast' },
        ],
      },
      {
        key: 'maxHeight',
        label: 'Resolution cap',
        type: 'select',
        default: '0',
        group: 'Transform',
        options: [
          { value: '0', label: 'Keep the original resolution' },
          { value: '1080', label: 'Down to 1080p' },
          { value: '720', label: 'Down to 720p' },
          { value: '480', label: 'Down to 480p' },
          { value: '360', label: 'Down to 360p' },
        ],
        help: 'Lowering the resolution is by far the most effective way to shrink a video.',
      },
      {
        key: 'fps',
        label: 'Frame rate',
        type: 'select',
        default: '0',
        group: 'Transform',
        options: [
          { value: '0', label: 'Keep the source rate' },
          { value: '30', label: '30 fps' },
          { value: '24', label: '24 fps' },
          { value: '15', label: '15 fps — screen recordings' },
        ],
      },
      {
        key: 'audioBitrate',
        label: 'Audio bitrate',
        type: 'select',
        default: '128k',
        group: 'Quality',
        options: [
          { value: '160k', label: '160 kbps' },
          { value: '128k', label: '128 kbps' },
          { value: '96k', label: '96 kbps' },
          { value: '64k', label: '64 kbps — voice only' },
          { value: 'none', label: 'Remove the audio track' },
        ],
      },
    ],
    steps: MEDIA_STEPS,
    notes: ffmpegNotes([
      'Compression is never guaranteed to reduce the size: if the source is already heavily compressed, a low CRF can produce a larger file. The tool reports the real before/after size and warns you when the output grew.',
      'VP9/WebM output is considerably slower to encode than H.264 in the browser.',
      'There is no hardware acceleration available to WebAssembly, so everything runs on the CPU.',
    ]),
    faq: [
      {
        q: 'How much can a video be compressed?',
        a: 'It depends entirely on the source. A phone recording at a high bitrate often shrinks 60–80 % at CRF 28 with no obvious difference. A clip that is already compressed for streaming may barely shrink at all, or even grow if you ask for a higher quality than the source.',
      },
      {
        q: 'What is CRF?',
        a: 'Constant Rate Factor is x264\'s quality-targeted mode: instead of aiming at a bitrate it aims at a constant visual quality and spends as many bits as each scene needs. Smaller numbers mean better quality and larger files. The scale runs from 0 (lossless) to 51 (worst); 18–28 covers almost every real use.',
      },
      {
        q: 'Why is this slower than an online converter?',
        a: 'Server converters use multi-core CPUs, hardware encoders and sometimes GPUs. A browser can only offer ffmpeg compiled to WebAssembly running on one thread. You trade speed for privacy: your video never leaves your device.',
      },
      {
        q: 'Can I compress a video to a specific size, for example 8 MB for WhatsApp?',
        a: 'Not directly with a target-size mode, because that requires two full encoding passes and would double an already slow job. Instead lower the resolution cap to 720p or 480p and raise the CRF until the reported output size fits.',
      },
    ],
    related: ['mov-to-mp4', 'video-to-gif', 'mp4-to-mp3', 'audio-compressor'],
  },

  /* ------------------------------------------------------- Audio compressor */
  {
    slug: 'audio-compressor',
    name: 'Audio Compressor',
    title: 'Audio Compressor — Reduce MP3, WAV & M4A Size Free | ConvertFlow',
    description:
      'Reduce the size of audio files in your browser: MP3, WAV, M4A, FLAC, OGG. Pick the codec, bitrate and channel layout.',
    category: 'audio',
    kind: 'compress',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: AUDIO_ACCEPT,
    inputFormats: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac'],
    outputFormats: ['mp3', 'ogg', 'opus', 'm4a'],
    defaultOutput: 'mp3',
    maxInputBytes: LIMITS.media,
    maxFiles: 5,
    icon: 'audio-lines',
    tags: ['reduce audio size', 'shrink mp3', 'opus', 'ogg'],
    settings: [
      {
        key: 'outputFormat',
        label: 'Output codec',
        type: 'select',
        default: 'mp3',
        group: 'Output',
        options: [
          { value: 'mp3', label: 'MP3 (LAME) — works everywhere' },
          { value: 'opus', label: 'Opus — best quality at low bitrates' },
          { value: 'ogg', label: 'OGG Vorbis — open format' },
          { value: 'm4a', label: 'M4A (AAC) — good compatibility on Apple devices' },
        ],
      },
      {
        key: 'bitrate',
        label: 'Bitrate',
        type: 'select',
        default: '128k',
        group: 'Quality',
        options: [
          { value: '320k', label: '320 kbps' },
          { value: '192k', label: '192 kbps' },
          { value: '160k', label: '160 kbps' },
          { value: '128k', label: '128 kbps — good music default' },
          { value: '96k', label: '96 kbps' },
          { value: '64k', label: '64 kbps — speech and podcasts' },
          { value: '32k', label: '32 kbps — voice notes only' },
        ],
      },
      {
        key: 'channels',
        label: 'Channels',
        type: 'select',
        default: 'source',
        group: 'Quality',
        options: [
          { value: 'source', label: 'Keep the source layout' },
          { value: '2', label: 'Stereo' },
          { value: '1', label: 'Mono — halves the bitrate needs of voice' },
        ],
      },
      {
        key: 'sampleRate',
        label: 'Sample rate',
        type: 'select',
        default: '0',
        group: 'Quality',
        options: [
          { value: '0', label: 'Keep the source rate' },
          { value: '44100', label: '44.1 kHz' },
          { value: '22050', label: '22.05 kHz' },
          { value: '16000', label: '16 kHz — telephone quality, smallest' },
        ],
      },
      {
        key: 'normalize',
        label: 'Loudness',
        type: 'select',
        default: 'off',
        group: 'Quality',
        options: [
          { value: 'off', label: 'Leave the level untouched' },
          { value: 'loudnorm', label: 'Normalise to broadcast loudness (EBU R128)' },
        ],
      },
    ],
    steps: MEDIA_STEPS,
    notes: ffmpegNotes([
      'A lossless source (WAV, FLAC) shrinks dramatically; an already-compressed MP3 at 128 kbps will not shrink further without an audible quality drop.',
      'Re-encoding a lossy file into another lossy format always loses something. Keep the original when the material matters.',
    ]),
    faq: [
      {
        q: 'Which codec gives the smallest file for the same quality?',
        a: 'Opus, clearly. At 64 kbps Opus generally beats MP3 at 128 kbps and AAC at 96 kbps. MP3 remains the safest choice when you do not control the playback device.',
      },
      {
        q: 'Can I make a voice recording smaller without it sounding bad?',
        a: 'Yes. Set the codec to Opus or MP3, channels to Mono, sample rate to 16 kHz or 22.05 kHz and the bitrate to 32–64 kbps. Speech tolerates all of these very well and the file becomes a fraction of the original.',
      },
      {
        q: 'Will compressing an MP3 make it worse?',
        a: 'Re-encoding a lossy file into another lossy format is a second generation of loss. If you must reduce an MP3, drop the bitrate by a wide margin (for example 320 → 128) rather than a small one, so the added artefacts stay below the ones already present.',
      },
      {
        q: 'Does loudness normalisation change the file size?',
        a: 'Not meaningfully. It adjusts the level of the audio before encoding, which is useful when you are combining recordings from different sources.',
      },
    ],
    related: ['mp4-to-mp3', 'wav-to-mp3', 'video-compressor'],
  },

  /* ---------------------------------------------------------- Video → GIF */
  {
    slug: 'video-to-gif',
    name: 'Video to GIF',
    title: 'Video to GIF Converter — Free, With Palette Optimisation | ConvertFlow',
    description:
      'Turn an MP4, MOV or WebM clip into an optimised GIF in your browser. Two-pass palette generation, frame rate and size control.',
    category: 'video',
    kind: 'convert',
    status: 'ready',
    engine: 'ffmpeg',
    processing: 'in-browser',
    accept: VIDEO_ACCEPT,
    inputFormats: ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'],
    outputFormats: ['gif'],
    defaultOutput: 'gif',
    maxInputBytes: LIMITS.media,
    maxFiles: 2,
    icon: 'film',
    tags: ['animation', 'meme', 'palette', 'loop'],
    settings: [
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        default: '480',
        group: 'Transform',
        options: [
          { value: '0', label: 'Keep the original width' },
          { value: '640', label: '640 px' },
          { value: '480', label: '480 px — recommended' },
          { value: '320', label: '320 px' },
          { value: '240', label: '240 px — smallest' },
        ],
        help: 'GIF size grows roughly with the square of the dimensions. Halving the width quarters the file size.',
      },
      {
        key: 'fps',
        label: 'Frame rate',
        type: 'select',
        default: '12',
        group: 'Quality',
        options: [
          { value: '24', label: '24 fps — smoothest, largest' },
          { value: '15', label: '15 fps' },
          { value: '12', label: '12 fps — recommended' },
          { value: '10', label: '10 fps' },
          { value: '8', label: '8 fps — smallest' },
        ],
      },
      {
        key: 'segment',
        label: 'Segment',
        type: 'text',
        default: '',
        group: 'Output',
        help: 'Optional start and end in seconds, e.g. "2,6" turns the clip from 0:02 to 0:06 into a GIF. Shorter is always dramatically smaller.',
      },
      {
        key: 'palette',
        label: 'Colour quality',
        type: 'select',
        default: 'high',
        group: 'Quality',
        options: [
          { value: 'high', label: 'Two-pass palette (best colours, slower)' },
          { value: 'fast', label: 'Single pass (faster, may band on gradients)' },
        ],
        help: 'GIF is limited to 256 colours. The two-pass mode analyses your clip first and builds a palette specifically for it, which is why the result looks far better.',
      },
      {
        key: 'loop',
        label: 'Looping',
        type: 'boolean',
        default: true,
        group: 'Output',
      },
    ],
    steps: [
      'Add a short clip — GIF is a heavy format, so a few seconds works best.',
      'Set the width, frame rate and the segment you want.',
      'Convert. Two-pass mode runs the clip twice: once to build the palette, once to encode.',
    ],
    notes: ffmpegNotes([
      'GIF is an inefficient format with no colour beyond 256 entries and no modern compression. A 5-second GIF is often larger than the source MP4 — the tool shows you the real sizes so you can decide.',
      'Two-pass palette generation doubles the encode time because the clip is processed twice.',
      'Audio is always dropped: the GIF format has no audio track.',
    ]),
    faq: [
      {
        q: 'Why is my GIF bigger than the video it came from?',
        a: 'Because GIF was designed in 1987. It stores up to 256 colours per frame with LZW compression and no inter-frame video coding, so it is often ten times less efficient than H.264. Reduce the width, the frame rate and the duration, or keep the MP4 and share that instead.',
      },
      {
        q: 'What settings give the best looking GIF?',
        a: '480 px wide, 12 fps, two-pass palette, and a segment of three to six seconds. That produces a file that is usually between 1 and 4 MB and looks good inline on a web page.',
      },
      {
        q: 'Do the colours look washed out?',
        a: 'That is the 256-colour limit. Make sure "Two-pass palette" is selected: it computes an optimal palette from your specific clip instead of using a generic one, which fixes most banding on gradients and skin tones.',
      },
      {
        q: 'Can I keep the sound?',
        a: 'No format of GIF supports audio. If you need sound, keep the MP4 or export a WebM, which is smaller and supports audio.',
      },
    ],
    related: ['video-compressor', 'mov-to-mp4', 'mp4-to-mp3'],
  },
];
