import type { SettingOption, ToolSetting } from './types';
import { SITE } from '../site-config';

/* -------------------------------------------------------------------------- */
/* Shared limits                                                              */
/* -------------------------------------------------------------------------- */

export const LIMITS = {
  image: SITE.limits.maxImageInputBytes,
  pdf: SITE.limits.maxPdfInputBytes,
  media: SITE.limits.maxMediaInputBytes,
  files: SITE.limits.maxFilesPerRun,
};

/* -------------------------------------------------------------------------- */
/* Reusable option lists                                                      */
/* -------------------------------------------------------------------------- */

export const OUTPUT_FORMAT_OPTIONS: Record<string, SettingOption[]> = {
  image: [
    { value: 'jpg', label: 'JPG — smallest, no transparency' },
    { value: 'png', label: 'PNG — lossless, keeps transparency' },
    { value: 'webp', label: 'WebP — modern, best compression' },
  ],
  pdfImage: [
    { value: 'jpg', label: 'JPG — best for photos' },
    { value: 'png', label: 'PNG — best for text and line art' },
    { value: 'webp', label: 'WebP — smallest, if your browser can encode it' },
  ],
};

export const IMAGE_ACCEPT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];
export const JPEG_PNG_ACCEPT = ['.jpg', '.jpeg', '.png'];

/* -------------------------------------------------------------------------- */
/* Setting builders — keep every tool consistent                              */
/* -------------------------------------------------------------------------- */

export function qualitySetting(defaultValue = 90, label = 'Image quality'): ToolSetting {
  return {
    key: 'quality',
    label,
    type: 'range',
    default: defaultValue,
    min: 30,
    max: 100,
    step: 1,
    unit: '%',
    group: 'Quality',
    help: 'Applies to lossy output (JPG, WebP). 100 keeps the most detail and the largest file; 75–85 is usually indistinguishable from the original.',
  };
}

export function backgroundSetting(): ToolSetting {
  return {
    key: 'background',
    label: 'Background for transparent areas',
    type: 'color',
    default: '#ffffff',
    group: 'Output',
    help: 'JPG has no alpha channel. Any transparent pixel is flattened onto this colour.',
  };
}

export function autoOrientSetting(): ToolSetting {
  return {
    key: 'autoOrient',
    label: 'Auto-orient from EXIF',
    type: 'boolean',
    default: true,
    group: 'Transform',
    help: 'Phone photos store rotation in EXIF metadata. When this is on, the output is baked the right way up. Turning it off keeps the stored pixel order.',
  };
}

export function outputFormatSetting(formats: string[], defaultValue: string): ToolSetting {
  return {
    key: 'outputFormat',
    label: 'Output format',
    type: 'select',
    default: defaultValue,
    group: 'Output',
    options: (OUTPUT_FORMAT_OPTIONS.image ?? []).filter((o) => formats.includes(String(o.value))),
  };
}

export interface ResizeSettingGroup {
  mode: ToolSetting;
  width: ToolSetting;
  height: ToolSetting;
  percent: ToolSetting;
}

export function resizeSettings(): ResizeSettingGroup {
  return {
    mode: {
      key: 'resizeMode',
      label: 'Resize',
      type: 'select',
      default: 'keep',
      group: 'Transform',
      options: [
        { value: 'keep', label: 'Keep original size' },
        { value: 'width', label: 'Set width (height scales automatically)' },
        { value: 'height', label: 'Set height (width scales automatically)' },
        { value: 'both', label: 'Set exact width and height' },
        { value: 'percent', label: 'Scale by percentage' },
      ],
      help: 'Downscaling is done in progressive halvings so the result stays sharp instead of aliasing.',
    },
    width: {
      key: 'resizeWidth',
      label: 'Width',
      type: 'number',
      default: 1280,
      min: 1,
      max: 20000,
      step: 1,
      unit: 'px',
      group: 'Transform',
    },
    height: {
      key: 'resizeHeight',
      label: 'Height',
      type: 'number',
      default: 720,
      min: 1,
      max: 20000,
      step: 1,
      unit: 'px',
      group: 'Transform',
    },
    percent: {
      key: 'resizePercent',
      label: 'Scale',
      type: 'number',
      default: 50,
      min: 1,
      max: 1000,
      step: 1,
      unit: '%',
      group: 'Transform',
    },
  };
}

export function pdfPageScaleSetting(): ToolSetting {
  return {
    key: 'scale',
    label: 'Resolution',
    type: 'select',
    default: '2',
    group: 'Quality',
    options: [
      { value: '1', label: 'Screen (72 DPI) — fastest, smallest' },
      { value: '1.5', label: 'Medium (108 DPI)' },
      { value: '2', label: 'Print (144 DPI) — recommended' },
      { value: '3', label: 'High (216 DPI) — large files, slow' },
    ],
    help: 'Higher resolution multiplies memory use. On a phone, stay at 144 DPI or below for long documents.',
  };
}

export function pdfPagesSetting(label = 'Pages'): ToolSetting {
  return {
    key: 'pages',
    label,
    type: 'pages',
    default: '',
    group: 'Output',
    help: 'Examples: 2 · 1-4 · 1,3,5-8 · leave empty for "all pages".',
  };
}

/* -------------------------------------------------------------------------- */
/* Shared copy                                                                */
/* -------------------------------------------------------------------------- */

export const BROWSER_PROCESSING_NOTE =
  'Every byte is processed by your own device inside this tab. Nothing is uploaded to a server, so the tool keeps working if the site has no backend, and your files never leave your machine.';

export function canvasNotes(extra: string[] = []): string[] {
  return [
    'The browser re-encodes the image, so EXIF metadata (GPS, camera model) is always removed from the output.',
    'Animated GIFs and WebP keep only their first frame — the browser canvas decodes a single still image.',
    'Very large images can fail on phones: browsers cap canvas area (roughly 16,384 × 16,384 px, and much less memory on mobile).',
    ...extra,
  ];
}

export function ffmpegNotes(extra: string[] = []): string[] {
  return [
    'Runs on ffmpeg compiled to WebAssembly, single-threaded, inside this tab. Expect roughly 0.3–2× realtime on a laptop and considerably slower on a phone.',
    'The wasm sandbox has a ~2 GB address space shared with the input and output buffers. Inputs above ~300 MB will often fail with an out-of-memory error.',
    'Only codecs compiled into the bundled ffmpeg core are available. DRM-protected sources cannot be decoded, and support for HEVC/H.265 or ProRes varies by codec profile and file — a failed decode is reported rather than guessed.',
    'The 32 MB ffmpeg core is downloaded once and cached by your browser. Nothing is uploaded.',
    ...extra,
  ];
}

export const IMAGE_STEPS = [
  'Choose one or more images, or drop them on the upload area.',
  'Adjust the output settings if you need to — the defaults already produce a good result.',
  'Press Convert, then Download for a single file or Download all for a ZIP.',
];

export const PDF_STEPS = [
  'Choose the PDF (or PDFs) you want to work on.',
  'Set the options below the file list — page ranges use the syntax 1,3,5-8.',
  'Press Convert and download the result. Everything happens in your browser.',
];
