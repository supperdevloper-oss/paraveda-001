import type { ToolDefinition } from './types';
import { SITE } from '../site-config';
import {
  LIMITS,
  qualitySetting,
  backgroundSetting,
  pdfPageScaleSetting,
  pdfPagesSetting,
  BROWSER_PROCESSING_NOTE,
  PDF_STEPS,
} from './shared';

const PDF_ACCEPT = ['.pdf', 'application/pdf'];

export const PDF_TOOLS: ToolDefinition[] = [
  /* ------------------------------------------------------------- JPG → PDF */
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    title: 'JPG to PDF Converter — Combine Images Into One PDF | ConvertFlow',
    description:
      'Turn JPG images into a PDF for free in your browser. One PDF per image or all images combined, with page size, orientation and margin control.',
    category: 'pdf',
    kind: 'convert',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: ['.jpg', '.jpeg', '.jfif', 'image/jpeg'],
    inputFormats: ['.jpg', '.jpeg'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'file-text',
    tags: ['image to pdf', 'photo pdf', 'scan', 'combine'],
    popular: true,
    settings: [
      {
        key: 'combine',
        label: 'Output',
        type: 'select',
        default: 'single',
        group: 'Layout',
        options: [
          { value: 'single', label: 'One PDF containing every image as a page' },
          { value: 'separate', label: 'One separate PDF per image' },
        ],
      },
      {
        key: 'pageSize',
        label: 'Page size',
        type: 'select',
        default: 'fit',
        group: 'Layout',
        options: [
          { value: 'fit', label: 'Fit to image (page is exactly the image size)' },
          { value: 'a4', label: 'A4 — 210 × 297 mm' },
          { value: 'letter', label: 'US Letter — 8.5 × 11 in' },
          { value: 'a3', label: 'A3 — 297 × 420 mm' },
          { value: 'a5', label: 'A5 — 148 × 210 mm' },
          { value: 'legal', label: 'US Legal — 8.5 × 14 in' },
        ],
        help: 'With a fixed page size the image is scaled down to fit inside the margins and centred; it is never stretched.',
      },
      {
        key: 'orientation',
        label: 'Page orientation',
        type: 'select',
        default: 'auto',
        group: 'Layout',
        options: [
          { value: 'auto', label: 'Automatic — follow the image shape' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ],
      },
      {
        key: 'margin',
        label: 'Margin',
        type: 'number',
        default: 0,
        min: 0,
        max: 60,
        step: 1,
        unit: 'mm',
        group: 'Layout',
        help: 'Only used with a fixed page size. 10 mm is a sensible value for printing.',
      },
      {
        key: 'imageQuality',
        label: 'Re-encode quality',
        type: 'select',
        default: 'original',
        group: 'Quality',
        options: [
          { value: 'original', label: 'Embed the original JPEG data (lossless, recommended)' },
          { value: 'reencode', label: 'Re-encode through the canvas (lets you shrink the PDF)' },
        ],
        help: 'Embedding the original bytes is instant and adds no generation loss. Re-encoding lets you apply the quality slider below.',
      },
      qualitySetting(85, 'Quality (re-encode only)'),
      {
        key: 'maxDimension',
        label: 'Longest edge (re-encode only)',
        type: 'select',
        default: '0',
        group: 'Quality',
        options: [
          { value: '0', label: 'Keep original resolution' },
          { value: '2480', label: 'Max 2480 px (300 DPI on A4)' },
          { value: '1920', label: 'Max 1920 px' },
          { value: '1280', label: 'Max 1280 px' },
        ],
      },
    ],
    steps: [
      'Add your JPG files. The page order is the order in the list — use the arrows to rearrange them.',
      'Choose one combined PDF or one PDF per image, then set the page size and margins.',
      'Press Convert and download the result.',
    ],
    notes: [
      'Images are embedded as JPEG streams inside the PDF, so the visual quality is identical to the source unless you pick re-encode.',
      'The file order controls the page order. Reorder with the up/down arrows before converting.',
      'Password-protected or DRM-restricted images cannot be read by the browser and will be reported as invalid.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'Can I combine several JPGs into one PDF?',
        a: 'Yes — that is the default. Every image you queue becomes one page, in the order shown in the list. Use the arrows to rearrange pages before converting.',
      },
      {
        q: 'Does the PDF keep the original image quality?',
        a: 'With the default "Embed the original JPEG data" option, yes exactly: the JPEG bitstream is placed inside the PDF untouched, so there is no re-compression at all. The re-encode option exists only for when you actively want a smaller PDF.',
      },
      {
        q: 'What page size should I choose for printing?',
        a: 'A4 for most of the world, US Letter for the United States and Canada. Set the margin to 5–10 mm so nothing is clipped by the printer, and use 300 DPI source images if you have them.',
      },
      {
        q: 'Is there a file limit?',
        a: `Each image may be up to ${Math.round(LIMITS.image / 1048576)} MB and you can queue ${LIMITS.files} of them. The practical ceiling is your device memory, since the whole PDF is assembled in the tab before it is downloaded.`,
      },
    ],
    related: ['png-to-pdf', 'pdf-to-jpg', 'merge-pdf', 'image-compressor'],
    about: [
      {
        heading: 'How images become a PDF',
        body: 'The PDF is assembled with pdf-lib, a JavaScript library that writes real PDF objects. Your JPEG data is embedded directly as an image XObject and a page of matching size is created around it, which is why the default path is both instant and lossless. Nothing is sent to a server and no PDF printer driver is involved.',
      },
    ],
  },

  /* ------------------------------------------------------------- PNG → PDF */
  {
    slug: 'png-to-pdf',
    name: 'PNG to PDF',
    title: 'PNG to PDF Converter — Free, Lossless, In-Browser | ConvertFlow',
    description:
      'Convert PNG images to PDF for free. PNG data is embedded losslessly, with page size, orientation and margin options. No upload.',
    category: 'pdf',
    kind: 'convert',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: ['.png', 'image/png'],
    inputFormats: ['.png'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.image,
    maxFiles: LIMITS.files,
    icon: 'file-text',
    tags: ['image to pdf', 'screenshot pdf', 'lossless'],
    settings: [
      {
        key: 'combine',
        label: 'Output',
        type: 'select',
        default: 'single',
        group: 'Layout',
        options: [
          { value: 'single', label: 'One PDF containing every image as a page' },
          { value: 'separate', label: 'One separate PDF per image' },
        ],
      },
      {
        key: 'pageSize',
        label: 'Page size',
        type: 'select',
        default: 'fit',
        group: 'Layout',
        options: [
          { value: 'fit', label: 'Fit to image (page is exactly the image size)' },
          { value: 'a4', label: 'A4 — 210 × 297 mm' },
          { value: 'letter', label: 'US Letter — 8.5 × 11 in' },
          { value: 'a3', label: 'A3 — 297 × 420 mm' },
          { value: 'a5', label: 'A5 — 148 × 210 mm' },
        ],
      },
      {
        key: 'orientation',
        label: 'Page orientation',
        type: 'select',
        default: 'auto',
        group: 'Layout',
        options: [
          { value: 'auto', label: 'Automatic — follow the image shape' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ],
      },
      {
        key: 'margin',
        label: 'Margin',
        type: 'number',
        default: 0,
        min: 0,
        max: 60,
        step: 1,
        unit: 'mm',
        group: 'Layout',
      },
      {
        key: 'transparency',
        label: 'Transparent areas',
        type: 'select',
        default: 'keep',
        group: 'Output',
        options: [
          { value: 'keep', label: 'Keep transparency (PNG is embedded as-is)' },
          { value: 'flatten', label: 'Flatten onto a white background (smaller PDF)' },
        ],
        help: 'Keeping transparency embeds the PNG losslessly. Flattening re-encodes through the canvas and can reduce the file size a lot for screenshots.',
      },
    ],
    steps: PDF_STEPS,
    notes: [
      'With "Keep transparency" the PNG is embedded unchanged: pixel-perfect and lossless.',
      'PNG screenshots with large flat areas embed very efficiently; photographs do not — convert those to JPG first.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'Is the PNG embedded losslessly?',
        a: 'Yes, when transparency is kept. pdf-lib supports embedding PNG data directly, so the pixels in the PDF are bit-identical to your source file.',
      },
      {
        q: 'My PDF is much bigger than the PNG. Why?',
        a: 'A PDF adds structure around the image, and if the source PNG is a photograph it is already poorly compressed. Choose "Flatten onto a white background" to re-encode, or run the image through the Image Compressor first.',
      },
      {
        q: 'Can I put many screenshots into one PDF?',
        a: `Yes. Queue up to ${LIMITS.files} PNG files and choose "One PDF containing every image as a page". Reorder the list with the arrows to set the page order.`,
      },
    ],
    related: ['jpg-to-pdf', 'pdf-to-jpg', 'merge-pdf'],
  },

  /* ------------------------------------------------------------- PDF → JPG */
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    title: 'PDF to JPG Converter — Render Pages as Images Free | ConvertFlow',
    description:
      'Convert each page of a PDF into a JPG, PNG or WebP image at up to 216 DPI. Free, rendered in your browser with pdf.js, no upload.',
    category: 'pdf',
    kind: 'convert',
    status: 'ready',
    engine: 'pdfjs',
    processing: 'in-browser',
    accept: PDF_ACCEPT,
    inputFormats: ['.pdf'],
    outputFormats: ['jpg', 'png', 'webp'],
    defaultOutput: 'jpg',
    maxInputBytes: LIMITS.pdf,
    maxFiles: 5,
    icon: 'file-image',
    tags: ['pdf to image', 'screenshot', 'render', 'dpi', 'extract pages'],
    popular: true,
    settings: [
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        default: 'jpg',
        group: 'Output',
        options: [
          { value: 'jpg', label: 'JPG — best for photos and scans' },
          { value: 'png', label: 'PNG — best for text, charts and line art' },
          { value: 'webp', label: 'WebP — smallest file' },
        ],
      },
      pdfPageScaleSetting(),
      pdfPagesSetting('Pages to convert'),
      qualitySetting(90),
      backgroundSetting(),
    ],
    steps: [
      'Add the PDF. The page count is read from the file and shown next to it.',
      'Pick the output format and the resolution, and narrow it to specific pages if you only need a few.',
      'Convert — one image per page — then download individually or take the ZIP.',
    ],
    notes: [
      'Rendering is done by Mozilla pdf.js, the same engine Firefox uses to display PDFs, running in a Web Worker.',
      'Each page becomes a separate image, so a 40-page PDF produces 40 files.',
      'Scanned PDFs convert perfectly because they already contain images. Vector-only pages (text, charts) are rasterised at the resolution you choose.',
      'Password-protected PDFs cannot be opened by pdf.js in this release and are reported clearly.',
      `Large documents at high DPI need a lot of memory: an A4 page at 216 DPI is roughly 2480 × 3508 px. Keep to ${Math.round(LIMITS.pdf / 1048576)} MB per file and a lower DPI on phones.`,
    ],
    faq: [
      {
        q: 'What resolution should I use?',
        a: '144 DPI (the default) is a good balance and is readable for text. Use 72 DPI for quick on-screen previews and 216–300 DPI only when the image will be printed. Higher settings multiply both time and memory.',
      },
      {
        q: 'Can I convert only one page of a long PDF?',
        a: 'Yes. Enter the page numbers in the Pages field using the syntax 1,3,5-8 and only those pages are rendered. Leaving it empty converts the whole document.',
      },
      {
        q: 'Does it work with scanned PDFs?',
        a: 'Yes, and the quality is excellent — a scan is already a raster image, so rendering simply extracts it at the resolution you choose.',
      },
      {
        q: 'Is the PDF uploaded to a server?',
        a: `No. ${BROWSER_PROCESSING_NOTE}`,
      },
      {
        q: 'Why does my text look blurry in the JPG?',
        a: 'JPEG is optimised for photographs and produces ringing around sharp black-on-white edges. Choose PNG output for text-heavy documents and the result will be crisp.',
      },
    ],
    related: ['jpg-to-pdf', 'png-to-pdf', 'split-pdf', 'merge-pdf'],
    about: [
      {
        heading: 'About the rendering engine',
        body: `PDF is a page-description language, not an image format, so turning a page into pixels means actually interpreting and drawing it. ${SITE.name} uses pdf.js — the open-source renderer behind Firefox — loaded on demand and running in a Web Worker so the interface stays responsive. Fonts, colour profiles and vector drawings are all resolved locally from the assets shipped with this site.`, 
      },
    ],
  },

  /* -------------------------------------------------------------- Merge PDF */
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    title: 'Merge PDF Files Online — Free PDF Combiner | ConvertFlow',
    description:
      'Combine multiple PDF files into one document for free. Reorder the pages, keep bookmarks and form fields, all inside your browser.',
    category: 'pdf',
    kind: 'organize',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: PDF_ACCEPT,
    inputFormats: ['.pdf'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.pdf,
    maxFiles: LIMITS.files,
    icon: 'combine',
    tags: ['combine', 'join', 'concatenate', 'merge pdfs'],
    popular: true,
    settings: [
      {
        key: 'order',
        label: 'Page order',
        type: 'select',
        default: 'list',
        group: 'Layout',
        options: [
          { value: 'list', label: 'Use the order of the file list (rearrange with the arrows)' },
          { value: 'name', label: 'Sort alphabetically by file name' },
          { value: 'size', label: 'Sort by file size, smallest first' },
        ],
      },
      {
        key: 'pageRanges',
        label: 'Only merge selected pages',
        type: 'pages',
        default: '',
        group: 'Output',
        help: 'Applied to every file in the list, e.g. 1-3 keeps only the first three pages of each PDF. Leave empty to merge whole documents.',
      },
    ],
    steps: [
      'Add two or more PDF files.',
      'Arrange them with the up/down arrows — the order of the list is the order of the pages.',
      'Press Convert and download the single combined PDF.',
    ],
    notes: [
      'Merging copies page content streams; interactive form fields (AcroForm) from the source files are not preserved as fillable fields.',
      'Encrypted PDFs must be decrypted before they can be merged. Files that pdf-lib cannot parse are reported individually and the rest still merge.',
      'The combined document is assembled in memory, so merging many very large PDFs can exhaust a phone or a small laptop.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'How do I change the order of the merged pages?',
        a: 'The output follows the file list exactly. Use the up and down arrows on each row (or drag on desktop) to put the documents in the order you want before pressing Convert.',
      },
      {
        q: 'Can I merge only some pages of each PDF?',
        a: 'Yes. Fill in the "Only merge selected pages" field with a page range such as 1-3 or 1,5. The same range is applied to every file in the list.',
      },
      {
        q: 'Does merging reduce the quality of my PDFs?',
        a: 'No. Merging copies the existing page objects into a new document; text stays text and images stay at their original resolution. Nothing is rasterised or re-compressed.',
      },
      {
        q: 'Is there a limit on how many PDFs I can merge?',
        a: `You can queue ${LIMITS.files} files of up to ${Math.round(LIMITS.pdf / 1048576)} MB each. The real constraint is memory: the whole result has to fit in the tab, so merging hundreds of megabytes on a phone may fail.`,
      },
      {
        q: 'Are my documents uploaded?',
        a: `No. ${BROWSER_PROCESSING_NOTE}`,
      },
    ],
    related: ['split-pdf', 'rotate-pdf', 'delete-pdf-pages', 'pdf-to-jpg'],
  },

  /* -------------------------------------------------------------- Split PDF */
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    title: 'Split PDF Online — Extract or Separate Pages Free | ConvertFlow',
    description:
      'Split a PDF into separate files: extract a page range, split every N pages, or turn every page into its own PDF. Free and in-browser.',
    category: 'pdf',
    kind: 'organize',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: PDF_ACCEPT,
    inputFormats: ['.pdf'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.pdf,
    maxFiles: 5,
    icon: 'scissors',
    tags: ['extract pages', 'separate', 'divide', 'split pages'],
    popular: true,
    settings: [
      {
        key: 'splitMode',
        label: 'How to split',
        type: 'select',
        default: 'ranges',
        group: 'Output',
        options: [
          { value: 'ranges', label: 'By page ranges — each range becomes one PDF' },
          { value: 'every', label: 'Every N pages — fixed-size chunks' },
          { value: 'each', label: 'Every page — one PDF per page' },
          { value: 'extract', label: 'Extract selected pages into a single PDF' },
        ],
      },
      {
        key: 'pages',
        label: 'Page ranges',
        type: 'pages',
        default: '',
        group: 'Output',
        help: 'Ranges mode: separate each range with a comma, e.g. "1-3,4-6,7" produces three PDFs. Extract mode: one list such as "2,5,8-10" produces one PDF.',
      },
      {
        key: 'everyN',
        label: 'Pages per file',
        type: 'number',
        default: 1,
        min: 1,
        max: 5000,
        step: 1,
        group: 'Output',
        help: 'Used in "Every N pages" mode.',
      },
    ],
    steps: [
      'Add the PDF. Its page count is shown so you can write the ranges accurately.',
      'Choose a split mode and enter the ranges or the chunk size.',
      'Convert and download each part, or take them all as one ZIP.',
    ],
    notes: [
      'Each output is a complete, standalone PDF with its own resources, so the parts open anywhere.',
      'Splitting copies pages without re-compressing them; the total size of the parts is usually slightly larger than the original because shared resources are duplicated.',
      'Bookmarks and outlines are not carried over to the parts.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'How do I split a PDF into single pages?',
        a: 'Choose "Every page — one PDF per page". A 20-page document produces 20 PDFs, delivered as a ZIP when you use Download all.',
      },
      {
        q: 'Can I extract just pages 5 to 12?',
        a: 'Yes. Select "Extract selected pages into a single PDF" and enter 5-12. You get one new PDF containing exactly those eight pages in order.',
      },
      {
        q: 'Why are the split files larger together than the original?',
        a: 'A PDF stores fonts and images once and shares them between pages. When pages are separated, each output has to carry its own copy of the resources it uses, so the sum of the parts can exceed the original. This is normal and does not mean quality was added or lost.',
      },
      {
        q: 'Is splitting lossless?',
        a: 'Yes. Pages are copied as objects; text remains selectable and images keep their original resolution. Nothing is rasterised.',
      },
    ],
    related: ['merge-pdf', 'delete-pdf-pages', 'rotate-pdf', 'pdf-to-jpg'],
  },

  /* ------------------------------------------------------------- Rotate PDF */
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF Pages',
    title: 'Rotate PDF Pages — Fix Upside-Down Documents Free | ConvertFlow',
    description:
      'Rotate all pages or a selected range of a PDF by 90, 180 or 270 degrees. Free, in-browser, no upload, keeps text selectable.',
    category: 'pdf',
    kind: 'edit',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: PDF_ACCEPT,
    inputFormats: ['.pdf'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.pdf,
    maxFiles: 10,
    icon: 'rotate-cw',
    tags: ['orientation', 'landscape', 'portrait', 'upside down', 'flip pages'],
    settings: [
      {
        key: 'angle',
        label: 'Rotation',
        type: 'select',
        default: '90',
        group: 'Transform',
        options: [
          { value: '90', label: '90° clockwise' },
          { value: '180', label: '180° (upside down)' },
          { value: '270', label: '90° counter-clockwise' },
        ],
      },
      {
        key: 'scope',
        label: 'Apply to',
        type: 'select',
        default: 'all',
        group: 'Transform',
        options: [
          { value: 'all', label: 'All pages' },
          { value: 'range', label: 'Only the pages listed below' },
        ],
      },
      pdfPagesSetting('Pages'),
      {
        key: 'relative',
        label: 'Existing rotation',
        type: 'select',
        default: 'add',
        group: 'Transform',
        options: [
          { value: 'add', label: 'Add to the current page rotation' },
          { value: 'set', label: 'Set the rotation to exactly this angle' },
        ],
        help: 'Some PDFs already carry a rotation flag. "Add" is what you usually want when fixing an upside-down scan.',
      },
    ],
    steps: [
      'Add the PDF and check the page count shown next to the file.',
      'Pick the angle and decide whether to apply it to all pages or to a range.',
      'Convert and download — text stays selectable, nothing is rasterised.',
    ],
    notes: [
      'Rotation is written as a page /Rotate flag, which is instant and completely lossless: no pixel is touched.',
      'Because it is a flag, a few very old PDF viewers may ignore it. If that happens, use PDF to JPG and rebuild the document.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'Does rotating a PDF reduce its quality?',
        a: 'No. The tool sets the standard PDF page-rotation flag rather than redrawing anything, so text stays sharp and selectable, images keep their resolution and the file size barely changes.',
      },
      {
        q: 'Can I rotate only a few pages?',
        a: 'Yes. Set "Apply to" to Only the pages listed below and enter the numbers, for example 3,7-9.',
      },
      {
        q: 'My scanned PDF is upside down. Which option fixes it?',
        a: 'Choose 180° with "Add to the current page rotation". If the pages already carry a rotation flag, adding is what produces the visually correct result.',
      },
      {
        q: 'Can I change portrait pages to landscape?',
        a: 'Rotating by 90° or 270° swaps the visual orientation of the content. The page box itself keeps its dimensions, which is exactly how PDF viewers handle rotated pages.',
      },
    ],
    related: ['merge-pdf', 'split-pdf', 'delete-pdf-pages', 'rotate-image'],
  },

  /* ------------------------------------------------------ Delete PDF pages */
  {
    slug: 'delete-pdf-pages',
    name: 'Delete PDF Pages',
    title: 'Delete Pages From a PDF — Free Page Remover | ConvertFlow',
    description:
      'Remove unwanted pages from a PDF for free. Enter the pages to delete or keep, all processed in your browser with no upload.',
    category: 'pdf',
    kind: 'edit',
    status: 'ready',
    engine: 'pdf-lib',
    processing: 'in-browser',
    accept: PDF_ACCEPT,
    inputFormats: ['.pdf'],
    outputFormats: ['pdf'],
    defaultOutput: 'pdf',
    maxInputBytes: LIMITS.pdf,
    maxFiles: 10,
    icon: 'trash-2',
    tags: ['remove pages', 'delete pages', 'extract', 'keep pages'],
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'delete',
        group: 'Output',
        options: [
          { value: 'delete', label: 'Delete the pages I list' },
          { value: 'keep', label: 'Keep only the pages I list (delete everything else)' },
        ],
      },
      pdfPagesSetting('Pages'),
    ],
    steps: [
      'Add the PDF and read its page count in the file list.',
      'List the pages to delete, or switch to Keep mode and list the pages you want to preserve.',
      'Convert and download the shorter document.',
    ],
    notes: [
      'At least one page must remain: a PDF with zero pages is not a valid document, and the tool refuses to create one.',
      'Removing pages does not shrink the file proportionally — fonts and images referenced by the deleted pages may still be embedded. Use Split PDF to extract the pages you want into a fresh, minimal file.',
      BROWSER_PROCESSING_NOTE,
    ],
    faq: [
      {
        q: 'How do I remove pages 4 to 10?',
        a: 'Keep the mode on "Delete the pages I list" and enter 4-10. The remaining pages keep their original order.',
      },
      {
        q: 'I only want pages 1 and 20 of a long PDF. What is fastest?',
        a: 'Switch to "Keep only the pages I list" and enter 1,20. For a very large source, Split PDF in extract mode produces a leaner file because it builds a fresh document.',
      },
      {
        q: 'Why did the file barely get smaller after deleting half the pages?',
        a: 'A PDF keeps a shared resource pool for fonts and images. Deleting a page removes the page, but resources it referenced may still be embedded because pdf-lib copies the document rather than rebuilding it. Extracting the pages you want with Split PDF gives a genuinely smaller result.',
      },
      {
        q: 'Can I delete every page?',
        a: 'No — a PDF must contain at least one page. The tool stops with a clear message instead of producing a corrupt file.',
      },
    ],
    related: ['split-pdf', 'merge-pdf', 'rotate-pdf'],
  },
];
