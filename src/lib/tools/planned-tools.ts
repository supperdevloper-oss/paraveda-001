import type { ToolDefinition } from './types';
import { LIMITS } from './shared';

/**
 * Tools that are NOT implemented.
 *
 * Rules enforced by the registry validator:
 *   - they never get a route (`generateStaticParams` skips them)
 *   - they never appear in the sitemap
 *   - they are only rendered on /coming-soon, never with a working button
 *   - every one of them must explain *why* it is not available yet
 */

const planned = (t: Partial<ToolDefinition> & Pick<ToolDefinition, 'slug' | 'name' | 'description' | 'category' | 'engine' | 'plannedReason'>): ToolDefinition => ({
  title: `${t.name} — coming soon`,
  kind: 'convert',
  status: 'coming-soon',
  processing: 'server',
  accept: [],
  inputFormats: [],
  outputFormats: [],
  maxInputBytes: LIMITS.image,
  maxFiles: 1,
  icon: 'clock',
  tags: [],
  settings: [],
  steps: [],
  faq: [],
  related: [],
  ...t,
} as ToolDefinition);

export const PLANNED_TOOLS: ToolDefinition[] = [
  planned({
    slug: 'docx-to-pdf',
    name: 'DOCX to PDF',
    description: 'Convert Word documents to PDF while keeping the original layout.',
    category: 'documents',
    engine: 'pdf-lib',
    icon: 'file-text',
    plannedReason:
      'A DOCX is not a page-description format: it has to be laid out by a real word-processing engine (line breaking, styles, tables, headers, footnotes, embedded fonts) before it can become pages. Browsers have no such engine, so this needs a server running LibreOffice or a comparable renderer. It is deliberately not shipped as a client-side "conversion" that would only rename the file.',
  }),
  planned({
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Rebuild an editable DOCX from a PDF, preserving the layout.',
    category: 'documents',
    engine: 'pdfjs',
    icon: 'file-text',
    plannedReason:
      'Extracting the text of a PDF is easy; reconstructing a faithful, editable Word document — with styles, tables, columns, images anchored to the right paragraph and reading order — is a hard document-analysis problem. Dumping raw text into a .docx would be a fake conversion, so this tool stays unavailable until a proper layout-reconstruction engine is integrated and its output quality has been verified.',
  }),
  planned({
    slug: 'heic-to-jpg',
    name: 'HEIC to JPG',
    description: 'Convert iPhone HEIC photos to JPG.',
    category: 'images',
    engine: 'ffmpeg',
    icon: 'image',
    plannedReason:
      'HEIC needs an HEIF/HEVC decoder. Safari can decode it natively but Chrome and Firefox cannot, and no browser exposes it through the canvas API. A WASM HEIF decoder is roughly 10 MB and slow; it will be added behind a capability check so the tool is only offered where it actually works.',
  }),
  planned({
    slug: 'pdf-compressor',
    name: 'PDF Compressor',
    description: 'Reduce the size of a PDF by recompressing the images inside it.',
    category: 'pdf',
    engine: 'pdf-lib',
    icon: 'minimize',
    plannedReason:
      'Doing this properly means parsing the PDF object graph, finding every image XObject, decoding it (including DCT, Flate, JBIG2 and CCITT variants), recompressing it and rewriting the cross-reference table without breaking annotations or form fields. pdf-lib can embed images but cannot reliably rewrite existing ones, so a partial implementation would corrupt documents.',
  }),
  planned({
    slug: 'epub-to-pdf',
    name: 'EPUB to PDF',
    description: 'Turn an EPUB e-book into a paginated PDF.',
    category: 'documents',
    engine: 'pdf-lib',
    icon: 'book-open',
    plannedReason:
      'EPUB is flowing HTML plus CSS; paginating it requires a full CSS layout engine with page-break rules, footnotes and a table of contents. That belongs on a server (Calibre, Prince, WeasyPrint).',
  }),
  planned({
    slug: 'pdf-to-epub',
    name: 'PDF to EPUB',
    description: 'Reflow a PDF into an EPUB e-book.',
    category: 'documents',
    engine: 'pdfjs',
    icon: 'book-open',
    plannedReason:
      'Requires the same document-analysis work as PDF to Word: reading order detection, paragraph merging across page breaks, image placement and heading inference. Not something that can be done honestly in a browser tab yet.',
  }),
  planned({
    slug: 'rar-to-zip',
    name: 'RAR to ZIP',
    description: 'Repackage a RAR archive as a ZIP.',
    category: 'documents',
    engine: 'ffmpeg',
    icon: 'archive',
    plannedReason:
      'RAR decompression is proprietary. A WASM port of unrar exists but is licensed differently from the rest of the stack and cannot handle RAR5 volumes or encrypted archives reliably, so it needs a licensing and coverage review first.',
  }),
  planned({
    slug: 'ocr-pdf',
    name: 'OCR — Scan to Searchable PDF',
    description: 'Add a real text layer to scanned PDFs.',
    category: 'pdf',
    engine: 'pdfjs',
    icon: 'scan-text',
    plannedReason:
      'Tesseract.js would work in the browser, but the language models are 10–30 MB each and a single A4 page takes several seconds, so this needs a proper job queue, progress reporting and memory budget before it can be offered without frustrating people.',
  }),
];
