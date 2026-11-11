import type { ToolDefinition } from './types';
import {
  LIMITS,
  IMAGE_ACCEPT,

  qualitySetting,
  backgroundSetting,
  autoOrientSetting,
  resizeSettings,
  canvasNotes,
  BROWSER_PROCESSING_NOTE,
  IMAGE_STEPS,
} from './shared';

const R = resizeSettings();

const CONVERTER_ABOUT = (from: string, to: string) => [
  {
    heading: `About this converter`,
    body: `This tool decodes your ${from} file with the browser's own image decoder and re-encodes it as ${to} on a canvas. Because the work happens locally there is no upload step, no queue and no waiting for a server — the only limit is the memory of the device you are using. Batch mode is supported: add several files and they are all converted in one run, then delivered as a single ZIP.`,
  },
];

export const IMAGE_TOOLS: ToolDefinition[] = [
  /* ---------------------------------------------------------------- JPG→PNG */
  {
    slug: 'jpg-to-png',
    name: 'JPG to PNG',
    title: 'JPG to PNG Converter — Free, In-Browser | ConvertFlow',
    description:
      'Convert JPG images to PNG for free, right in your browser. Batch conversion, optional resizing, no upload, no watermark, no sign-up.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.jpg', '.jpeg', '.jfif', 'image/jpeg'],
    inputFormats: ['.jpg', '.jpeg'],
    outputFormats: ['png'],
    defaultOutput: 'png',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['jpeg', 'jpg2png', 'photo', 'lossless', 'transparent'],
    popular: true,
    settings: [qualitySetting(100, 'PNG compression effort'), autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'PNG is lossless, so the output is usually larger than the source JPG — that is expected and is the price of not losing any more quality.',
      'A JPG never contains transparency. Converting it to PNG will not make any part of it transparent; use an editor for that.',
    ]),
    faq: [
      {
        q: 'Does converting JPG to PNG improve the image quality?',
        a: 'No. A JPG has already discarded detail when it was saved, and re-encoding it as PNG cannot bring that detail back. What PNG does give you is a lossless container: from this point on, further edits and saves will not degrade the image any more.',
      },
      {
        q: 'Why is my PNG bigger than the original JPG?',
        a: 'PNG uses lossless compression, which is designed for flat colour, text and line art. Photographic content compresses much better with JPEG, so a photo saved as PNG is typically two to five times larger. If size matters more than fidelity, use JPG to WebP or the Image Compressor instead.',
      },
      {
        q: 'Will the transparent background of my image be preserved?',
        a: 'A JPG file cannot store transparency at all — every pixel already has a solid colour. The PNG output will therefore be fully opaque. If your source is a PNG or WebP with an alpha channel, use PNG to PNG-style tools or the Image Resizer, which keep transparency intact.',
      },
      {
        q: 'Are my images uploaded to a server?',
        a: `No. ${BROWSER_PROCESSING_NOTE}`,
      },
      {
        q: 'Can I convert many JPGs at once?',
        a: `Yes. Add up to ${LIMITS.files} files in one run. When more than one output is produced you get a Download all button that packs everything into a single ZIP archive.`,
      },
    ],
    related: ['png-to-jpg', 'jpg-to-webp', 'image-compressor', 'image-resizer', 'jpg-to-pdf'],
    about: CONVERTER_ABOUT('JPG', 'PNG'),
  },

  /* ---------------------------------------------------------------- PNG→JPG */
  {
    slug: 'png-to-jpg',
    name: 'PNG to JPG',
    title: 'PNG to JPG Converter — Free, In-Browser | ConvertFlow',
    description:
      'Convert PNG images to JPG for free in your browser. Choose the background colour for transparent areas, batch convert and download a ZIP.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.png', 'image/png'],
    inputFormats: ['.png'],
    outputFormats: ['jpg'],
    defaultOutput: 'jpg',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['jpeg', 'png2jpg', 'flatten', 'background'],
    popular: true,
    settings: [qualitySetting(90), backgroundSetting(), autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'JPG cannot store transparency. Fully or partially transparent pixels are blended onto the background colour you pick (white by default).',
      'JPG is lossy: at quality 90 the difference is very hard to see, but repeated re-saving keeps degrading the image.',
    ]),
    faq: [
      {
        q: 'What happens to the transparent parts of my PNG?',
        a: 'JPG has no alpha channel, so transparency must be replaced by a real colour. This tool flattens the image onto the background colour in the settings — white by default. For a logo on a coloured page, set the background to that colour before converting, otherwise you will get a white box around the artwork.',
      },
      {
        q: 'Which quality setting should I use?',
        a: '90 is a good default for photographs. Use 95–100 when the image contains sharp text or thin lines, because JPEG ringing is most visible there. Below 70 you will start to see blocking artefacts in gradients.',
      },
      {
        q: 'Is the conversion really free and private?',
        a: `Yes on both counts. ${BROWSER_PROCESSING_NOTE}`,
      },
      {
        q: 'Can I reduce the file size at the same time?',
        a: 'Yes — combine a lower quality value with the Resize options, or run the result through the Image Compressor, which can also search for the highest quality that fits a target file size.',
      },
    ],
    related: ['jpg-to-png', 'png-to-webp', 'image-compressor', 'jpg-to-pdf', 'crop-image'],
    about: CONVERTER_ABOUT('PNG', 'JPG'),
  },

  /* -------------------------------------------------------------- WEBP→JPG */
  {
    slug: 'webp-to-jpg',
    name: 'WebP to JPG',
    title: 'WebP to JPG Converter — Free, In-Browser | ConvertFlow',
    description:
      'Turn WebP images into universally compatible JPG files for free. Runs entirely in your browser, batch supported, no upload.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.webp', 'image/webp'],
    inputFormats: ['.webp'],
    outputFormats: ['jpg'],
    defaultOutput: 'jpg',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['webp2jpg', 'jpeg', 'compatibility'],
    popular: true,
    settings: [qualitySetting(92), backgroundSetting(), autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'Animated WebP files keep only their first frame — the canvas API decodes a single still image.',
      'Lossless WebP with transparency is flattened onto the background colour, because JPG cannot store an alpha channel.',
    ]),
    faq: [
      {
        q: 'Why would I convert WebP back to JPG?',
        a: 'WebP is well supported in browsers but still rejected by plenty of desktop software, print services, older Office versions and some upload forms. JPG opens everywhere, which makes it the safe format for anything leaving the web.',
      },
      {
        q: 'Do I lose quality going from WebP to JPG?',
        a: 'Slightly, because you are re-encoding from one lossy format into another. At quality 92 the additional loss is generally invisible. If you want to avoid any further loss, convert to PNG instead.',
      },
      {
        q: 'What about animated WebP?',
        a: 'This tool exports the first frame as a still image. Browser canvas APIs do not expose individual animation frames, so a full animation cannot be rebuilt here — that needs a server-side decoder.',
      },
      {
        q: 'Is my image uploaded anywhere?',
        a: `No. ${BROWSER_PROCESSING_NOTE}`,
      },
    ],
    related: ['webp-to-png', 'jpg-to-webp', 'png-to-webp', 'image-compressor'],
    about: CONVERTER_ABOUT('WebP', 'JPG'),
  },

  /* -------------------------------------------------------------- WEBP→PNG */
  {
    slug: 'webp-to-png',
    name: 'WebP to PNG',
    title: 'WebP to PNG Converter — Keeps Transparency | ConvertFlow',
    description:
      'Convert WebP to lossless PNG and keep the alpha channel intact. Free, in-browser, batch conversion with ZIP download.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.webp', 'image/webp'],
    inputFormats: ['.webp'],
    outputFormats: ['png'],
    defaultOutput: 'png',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['webp2png', 'alpha', 'transparency', 'lossless'],
    settings: [autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'Transparency is preserved: the output PNG keeps the same alpha channel as the source WebP.',
      'Animated WebP keeps only its first frame.',
      'Because PNG is lossless, output files are usually larger than the WebP source.',
    ]),
    faq: [
      {
        q: 'Is transparency preserved?',
        a: 'Yes. Both WebP and PNG support a full 8-bit alpha channel, and the canvas keeps it when the destination is PNG. Semi-transparent edges such as soft shadows survive the conversion.',
      },
      {
        q: 'The PNG is much bigger than the WebP — is that a bug?',
        a: 'No, that is expected. WebP was designed to beat PNG at its own game, typically 25–35 % smaller for the same lossless image. Choose PNG when you need maximum compatibility or a lossless master to edit from.',
      },
      {
        q: 'Can I batch convert a folder of WebP files?',
        a: `Yes, up to ${LIMITS.files} per run. You cannot drop a whole folder from the operating system file dialog in every browser, but you can multi-select files with Ctrl/Cmd-click.`,
      },
    ],
    related: ['webp-to-jpg', 'png-to-webp', 'image-resizer', 'crop-image'],
    about: CONVERTER_ABOUT('WebP', 'PNG'),
  },

  /* -------------------------------------------------------------- JPG→WEBP */
  {
    slug: 'jpg-to-webp',
    name: 'JPG to WebP',
    title: 'JPG to WebP Converter — Smaller Files, Free | ConvertFlow',
    description:
      'Convert JPG images to WebP and typically cut the file size by a quarter or more. Free, in-browser, batch conversion.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.jpg', '.jpeg', '.jfif', 'image/jpeg'],
    inputFormats: ['.jpg', '.jpeg'],
    outputFormats: ['webp'],
    defaultOutput: 'webp',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['webp', 'compress', 'modern'],
    popular: true,
    settings: [qualitySetting(82), autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'WebP encoding depends on the browser. Chrome, Edge, Firefox and Safari 16+ all support it; if your browser cannot encode WebP the tool tells you instead of silently producing a broken file.',
      'The reported size saving is measured on your actual file, not an average.',
    ]),
    faq: [
      {
        q: 'How much smaller is WebP than JPG?',
        a: 'For photographs, typically 25–35 % smaller at equivalent visual quality. The exact number depends on the image and on the quality your JPG was saved at — the tool shows the measured before/after size and the saving percentage for every file you convert.',
      },
      {
        q: 'Where is WebP not supported?',
        a: 'All current browsers handle it. Problems still show up in older desktop software, some Windows shell extensions, older versions of Office and a few web upload forms. Keep a JPG copy if the destination is unknown.',
      },
      {
        q: 'Can I go back from WebP to JPG later?',
        a: 'Yes, use the WebP to JPG tool on this site. Each round trip is lossy though, so decide on one delivery format and stick to it.',
      },
    ],
    related: ['jpg-to-png', 'webp-to-jpg', 'png-to-webp', 'image-compressor'],
    about: CONVERTER_ABOUT('JPG', 'WebP'),
  },

  /* -------------------------------------------------------------- PNG→WEBP */
  {
    slug: 'png-to-webp',
    name: 'PNG to WebP',
    title: 'PNG to WebP Converter — Keeps Transparency | ConvertFlow',
    description:
      'Convert PNG images to WebP with the alpha channel intact and a much smaller file. Free and fully in-browser.',
    category: 'images',
    kind: 'convert',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: ['.png', 'image/png'],
    inputFormats: ['.png'],
    outputFormats: ['webp'],
    defaultOutput: 'webp',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'image',
    tags: ['webp', 'alpha', 'compress'],
    settings: [qualitySetting(85), autoOrientSetting(), R.mode, R.width, R.height, R.percent],
    steps: IMAGE_STEPS,
    notes: canvasNotes([
      'Transparency is preserved in the WebP output.',
      'WebP encoding requires a browser that supports canvas.toBlob("image/webp"). If yours does not, the tool reports it clearly.',
    ]),
    faq: [
      {
        q: 'Does WebP keep my transparent background?',
        a: 'Yes. WebP supports an 8-bit alpha channel just like PNG, and this tool encodes it, so logos and cut-out images keep their transparency.',
      },
      {
        q: 'Should I use quality or lossless mode?',
        a: 'The quality slider drives lossy WebP, which is dramatically smaller and ideal for photographs and screenshots. For pixel-perfect artwork such as icons with hard edges, stay at 95–100 or keep the PNG.',
      },
    ],
    related: ['webp-to-png', 'jpg-to-webp', 'image-compressor', 'png-to-jpg'],
    about: CONVERTER_ABOUT('PNG', 'WebP'),
  },

  /* ------------------------------------------------------- Image compressor */
  {
    slug: 'image-compressor',
    name: 'Image Compressor',
    title: 'Image Compressor — Reduce JPG, PNG & WebP Size Free | ConvertFlow',
    description:
      'Compress JPG, PNG and WebP images in your browser. Set a quality level or a target file size in KB, batch compress and download a ZIP.',
    category: 'images',
    kind: 'compress',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: [...IMAGE_ACCEPT, 'image/*'],
    inputFormats: IMAGE_ACCEPT,
    outputFormats: ['jpg', 'png', 'webp'],
    defaultOutput: 'auto',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'minimize',
    tags: ['compress', 'reduce size', 'optimise', 'optimize', 'kb', 'target size'],
    popular: true,
    settings: [
      {
        key: 'mode',
        label: 'Compression mode',
        type: 'select',
        default: 'quality',
        group: 'Quality',
        options: [
          { value: 'quality', label: 'Choose a quality level' },
          { value: 'target', label: 'Reach a target file size (KB)' },
        ],
        help: 'Target mode runs a real binary search: it encodes the image repeatedly until the result fits under the size you ask for, and reports the quality it settled on.',
      },
      qualitySetting(78),
      {
        key: 'targetKb',
        label: 'Target size',
        type: 'number',
        default: 200,
        min: 5,
        max: 50000,
        step: 5,
        unit: 'KB',
        group: 'Quality',
        help: 'Used in target mode only. If the image cannot get this small at the minimum quality, the smallest achievable result is returned and the tool says so.',
      },
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        default: 'auto',
        group: 'Output',
        options: [
          { value: 'auto', label: 'Automatic — keep the source format when it is lossy' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP (usually smallest)' },
          { value: 'png', label: 'PNG (lossless)' },
        ],
        help: 'PNG output is lossless, so it will not shrink photographs — it is offered for images that must stay pixel-exact.',
      },
      {
        key: 'maxDimension',
        label: 'Longest edge',
        type: 'select',
        default: '0',
        group: 'Transform',
        options: [
          { value: '0', label: 'Keep original dimensions' },
          { value: '3840', label: 'Max 3840 px (4K)' },
          { value: '2560', label: 'Max 2560 px' },
          { value: '1920', label: 'Max 1920 px (Full HD)' },
          { value: '1280', label: 'Max 1280 px' },
          { value: '800', label: 'Max 800 px' },
        ],
        help: 'Downscaling before encoding is the single most effective way to reduce file size. The aspect ratio is always preserved.',
      },
      backgroundSetting(),
      autoOrientSetting(),
    ],
    steps: [
      'Add the images you want to shrink — JPG, PNG, WebP, GIF, BMP and AVIF all decode.',
      'Pick a quality level, or switch to target mode and enter the size in KB you need to hit.',
      'Convert, compare the before/after sizes and the saving percentage, then download or take the ZIP.',
    ],
    notes: canvasNotes([
      'Honest limits of browser compression: PNG output cannot shrink photographs, because PNG is lossless. Real reduction comes from lossy JPG/WebP encoding plus downscaling.',
      'Target-size mode needs several encode passes, so it is a few times slower than plain quality mode.',
      'There is no advanced entropy coding here (no MozJPEG, no oxipng, no cwebp). Dedicated native encoders can beat a browser canvas by 5–15 % on the same image.',
      'The compression ratio you see is measured on your file, so it is real — but it is never guaranteed in advance.',
    ]),
    faq: [
      {
        q: 'How much can an image realistically be compressed?',
        a: 'For a typical phone photograph saved as JPG at maximum quality, 60–80 % reduction with no visible difference is common, and more if you also downscale. For an image that is already well compressed, expect only a few percent. Screenshots and flat graphics compress very well as WebP. The tool always reports the actual measured saving rather than promising a number.',
      },
      {
        q: 'What does "target file size" mode do?',
        a: 'You enter a size in KB and the tool performs a binary search on the quality parameter: it encodes, measures, adjusts and repeats until the output fits under your target. It stops at the smallest achievable size if the target is unreachable, and tells you the quality value it landed on.',
      },
      {
        q: 'Does compression remove the metadata?',
        a: 'Yes. Re-encoding through a canvas always drops EXIF, ICC profiles and comments, including GPS coordinates. That is usually what you want before publishing a photo, but it also means you cannot round-trip camera metadata.',
      },
      {
        q: 'Will my images lose quality?',
        a: 'Lossy formats discard information by design; the quality slider controls how much. Between 80 and 92 most people cannot tell the difference on screen. If you need a pixel-exact result, choose PNG output and rely on downscaling instead of quality reduction.',
      },
      {
        q: 'Can I compress many images for a website at once?',
        a: `Yes. Queue up to ${LIMITS.files} files, set the options once and convert them all in one run. With several outputs you get a Download all button that packs the results into a single ZIP.`,
      },
    ],
    related: ['image-resizer', 'jpg-to-webp', 'png-to-jpg', 'crop-image'],
    about: [
      {
        heading: 'How browser image compression works',
        body: 'Your image is decoded into raw pixels, optionally downscaled in progressive halvings to keep edges sharp, and then re-encoded with the browser\'s own JPEG/WebP/PNG encoder. Each step runs on your device. Because the encoder is the one built into your browser rather than a specialised tool like MozJPEG or cwebp, the results are very good but not class-leading — in exchange you get zero uploads, zero waiting and zero cost.',
      },
    ],
  },

  /* --------------------------------------------------------- Image resizer */
  {
    slug: 'image-resizer',
    name: 'Image Resizer',
    title: 'Image Resizer — Resize Images to Exact Pixels Free | ConvertFlow',
    description:
      'Resize images to exact pixels, a percentage, or fit inside a box. Preserves aspect ratio, keeps transparency, works in your browser for free.',
    category: 'images',
    kind: 'edit',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: [...IMAGE_ACCEPT, 'image/*'],
    inputFormats: IMAGE_ACCEPT,
    outputFormats: ['jpg', 'png', 'webp'],
    defaultOutput: 'auto',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'expand',
    tags: ['resize', 'scale', 'dimensions', 'pixels', 'thumbnail'],
    popular: true,
    settings: [
      {
        key: 'resizeMode',
        label: 'How to set the new size',
        type: 'select',
        default: 'width',
        group: 'Transform',
        options: [
          { value: 'width', label: 'Width — height keeps the aspect ratio' },
          { value: 'height', label: 'Height — width keeps the aspect ratio' },
          { value: 'both', label: 'Exact width and height (may distort)' },
          { value: 'fit', label: 'Fit inside a box (keeps aspect ratio)' },
          { value: 'cover', label: 'Cover a box and crop the overflow' },
          { value: 'percent', label: 'Scale by a percentage' },
        ],
      },
      R.width,
      R.height,
      R.percent,
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        default: 'auto',
        group: 'Output',
        options: [
          { value: 'auto', label: 'Same as the source (JPG stays JPG, PNG stays PNG)' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      qualitySetting(90),
      backgroundSetting(),
      autoOrientSetting(),
    ],
    steps: [
      'Add an image — its real pixel dimensions are read and shown next to the file.',
      'Choose how to specify the new size and enter the numbers.',
      'Convert and download. Transparency is preserved for PNG and WebP output.',
    ],
    notes: canvasNotes([
      'Upscaling cannot invent detail: enlarging a small image produces a smooth but soft result. Downscaling uses progressive halvings so it stays crisp.',
      'Exact width + height mode will stretch the image if the ratio does not match. Use Fit or Cover to avoid distortion.',
    ]),
    faq: [
      {
        q: 'What size should I resize images to for a website?',
        a: 'Match the largest width the image is actually displayed at, times the device pixel ratio you want to support. For a full-width hero on a modern screen, 1920–2560 px wide is typical; for content images, 1200–1600 px. Anything wider than that is usually wasted bytes.',
      },
      {
        q: 'Does resizing keep transparency?',
        a: 'Yes, when the output format is PNG or WebP. If you output JPG the transparent areas are flattened onto the background colour from the settings.',
      },
      {
        q: 'Can I enlarge a small image without losing quality?',
        a: 'Not really. This tool resamples pixels, so upscaling interpolates between existing ones — the result is larger but softer. Genuine enlargement needs an AI upscaler, which requires a model and a server or a large local download, so it is not part of this release.',
      },
      {
        q: 'Can I resize many images to the same dimensions at once?',
        a: `Yes. Add up to ${LIMITS.files} files and the same settings are applied to all of them, then download everything as one ZIP.`,
      },
    ],
    related: ['crop-image', 'image-compressor', 'rotate-image', 'jpg-to-webp'],
    about: [
      {
        heading: 'Resize modes explained',
        body: 'Width and Height keep the original aspect ratio and are what you want most of the time. Fit scales the image so that it is entirely inside the box you give, which is perfect for thumbnails of mixed shapes. Cover fills the box completely and crops whatever overflows, which is what you want for avatars and cards. Exact stretches to both numbers and will distort the image unless the ratio already matches.',
      },
    ],
  },

  /* ------------------------------------------------------------ Crop image */
  {
    slug: 'crop-image',
    name: 'Crop Image',
    title: 'Crop Image Online — Free Cropping Tool | ConvertFlow',
    description:
      'Crop images online with a draggable selection box and preset aspect ratios. Free, no upload, works on desktop and touch devices.',
    category: 'images',
    kind: 'edit',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: [...IMAGE_ACCEPT, 'image/*'],
    inputFormats: IMAGE_ACCEPT,
    outputFormats: ['jpg', 'png', 'webp'],
    defaultOutput: 'auto',
    maxInputBytes: LIMITS.image,
    maxFiles: 4,
    icon: 'crop',
    tags: ['crop', 'trim', 'cut', 'aspect ratio'],
    popular: true,
    settings: [
      {
        key: 'crop',
        label: 'Crop area',
        type: 'crop',
        default: 'full',
        group: 'Transform',
        help: 'Set the crop rectangle as x, y, width, height fractions from 0 to 1. For example, 0.1,0.1,0.8,0.8 trims 10% from each edge. The default keeps the whole image.',
      },
      {
        key: 'aspectRatio',
        label: 'Aspect ratio',
        type: 'select',
        default: 'free',
        group: 'Transform',
        options: [
          { value: 'free', label: 'Free' },
          { value: '1:1', label: 'Square 1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:2', label: '3:2 (classic photo)' },
          { value: '16:9', label: '16:9 (widescreen)' },
          { value: '9:16', label: '9:16 (story / reel)' },
          { value: '2:1', label: '2:1' },
        ],
      },
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        default: 'auto',
        group: 'Output',
        options: [
          { value: 'auto', label: 'Same as the source' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      qualitySetting(92),
      backgroundSetting(),
    ],
    steps: [
      'Add a single image — the crop editor opens directly under the file list.',
      'Drag the handles to frame the part you want, and lock an aspect ratio if you need exact proportions.',
      'Press Convert to get the cropped file at full original resolution.',
    ],
    notes: canvasNotes([
      'The crop rectangle is stored as a fraction of the image, so the output is cut at full original resolution, not at preview resolution.',
      'This tool is designed for one image at a time; a maximum of 4 files can be queued.',
    ]),
    faq: [
      {
        q: 'Is the cropped image full resolution?',
        a: 'Yes. The selection you draw is converted into proportional coordinates and applied to the original pixel data, so cropping a 6000 × 4000 photo to the centre half gives you 3000 × 2000, not the size of the preview box.',
      },
      {
        q: 'Can I crop to an exact aspect ratio?',
        a: 'Yes — pick 1:1, 4:3, 3:2, 16:9, 9:16 or 2:1 and the selection box is locked to that ratio while you drag it.',
      },
      {
        q: 'Does cropping work on a phone?',
        a: 'Yes. The selection responds to touch: drag inside to move, drag a corner to resize. On a small screen the preview is scaled to fit, which does not affect the output resolution.',
      },
    ],
    related: ['image-resizer', 'rotate-image', 'image-compressor'],
  },

  /* ---------------------------------------------------------- Rotate image */
  {
    slug: 'rotate-image',
    name: 'Rotate Image',
    title: 'Rotate Image — 90°, 180°, 270° or Any Angle | ConvertFlow',
    description:
      'Rotate an image by 90, 180 or 270 degrees, or by any custom angle. Flip horizontally or vertically. Free and in-browser.',
    category: 'images',
    kind: 'edit',
    status: 'ready',
    engine: 'canvas',
    processing: 'in-browser',
    accept: [...IMAGE_ACCEPT, 'image/*'],
    inputFormats: IMAGE_ACCEPT,
    outputFormats: ['jpg', 'png', 'webp'],
    defaultOutput: 'auto',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'rotate',
    tags: ['rotate', 'flip', 'mirror', 'exif', 'orientation'],
    settings: [
      {
        key: 'rotate',
        label: 'Rotation',
        type: 'select',
        default: '90',
        group: 'Transform',
        options: [
          { value: '90', label: '90° clockwise' },
          { value: '180', label: '180°' },
          { value: '270', label: '90° counter-clockwise' },
          { value: 'custom', label: 'Custom angle' },
        ],
      },
      {
        key: 'angle',
        label: 'Custom angle',
        type: 'number',
        default: 0,
        min: -360,
        max: 360,
        step: 0.5,
        unit: '°',
        group: 'Transform',
        help: 'Used when Rotation is set to Custom. Positive values rotate clockwise. The canvas grows so no part of the image is cut off.',
      },
      {
        key: 'flip',
        label: 'Flip',
        type: 'select',
        default: 'none',
        group: 'Transform',
        options: [
          { value: 'none', label: 'No flip' },
          { value: 'h', label: 'Mirror horizontally' },
          { value: 'v', label: 'Flip vertically' },
        ],
      },
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        default: 'auto',
        group: 'Output',
        options: [
          { value: 'auto', label: 'Same as the source' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      qualitySetting(92),
      backgroundSetting(),
      {
        key: 'autoOrient',
        label: 'Apply EXIF orientation first',
        type: 'boolean',
        default: true,
        group: 'Transform',
        help: 'If a phone photo already looks sideways, its EXIF flag is the reason. Fix that first, then apply the rotation you chose.',
      },
    ],
    steps: [
      'Add the image you want to turn.',
      'Choose 90°, 180°, 270° or a custom angle, and optionally flip it.',
      'Convert and download — the output canvas is enlarged automatically so nothing is clipped.',
    ],
    notes: canvasNotes([
      'For a custom (non-90°) angle the output canvas grows to the bounding box of the rotated image; the corners that appear are filled with the background colour for JPG, or left transparent for PNG/WebP.',
    ]),
    faq: [
      {
        q: 'My photo looks sideways even though it is a JPG. Why?',
        a: 'Phone cameras store the picture in sensor orientation and record the correct rotation in an EXIF flag. Software that reads the flag shows it correctly, software that ignores it shows it sideways. Enable "Apply EXIF orientation first" and the flag is baked into the pixels, so the image looks right everywhere.',
      },
      {
        q: 'Will rotating by 90 degrees degrade the image?',
        a: 'A 90/180/270 rotation is a pure pixel shuffle with no resampling, so there is no geometric quality loss. Because the file is re-encoded as JPG there is a small generation loss; choose PNG output if you want to avoid even that.',
      },
      {
        q: 'What happens to the corners when I rotate by an arbitrary angle?',
        a: 'The canvas is enlarged to the bounding box of the rotated image, so nothing is cropped away. The new corner areas are transparent for PNG/WebP output and filled with your chosen background colour for JPG.',
      },
    ],
    related: ['crop-image', 'image-resizer', 'png-to-jpg', 'rotate-pdf'],
  },
];
