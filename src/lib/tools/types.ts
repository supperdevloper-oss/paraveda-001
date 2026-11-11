/**
 * Tool registry types.
 *
 * Every tool on the site is described by exactly one `ToolDefinition`. The UI
 * (cards, menus, search, settings forms, results panel) and the SEO layer
 * (metadata, sitemap, structured data) are both generated from this record, so
 * adding a tool never means touching a page component.
 */

export type ToolCategory = 'images' | 'video' | 'audio' | 'documents' | 'pdf';

export type ToolKind = 'convert' | 'compress' | 'edit' | 'organize';

/** Which engine actually does the work. Drives lazy-loading + the "processed where" badge. */
export type EngineId = 'canvas' | 'pdf-lib' | 'pdfjs' | 'ffmpeg';

/**
 * `ready`      -> fully implemented, gets a route, appears in menus + sitemap.
 * `coming-soon`-> listed on /coming-soon only. Never routed, never indexed,
 *                 never rendered with a working button.
 */
export type ToolStatus = 'ready' | 'coming-soon';

export type SettingFieldType =
  | 'select'
  | 'number'
  | 'range'
  | 'boolean'
  | 'color'
  | 'pages' // "1,3,5-8" page-range syntax
  | 'crop' // interactive crop editor
  | 'text'; // free-form text / page range

export interface SettingOption<T extends string | number = string | number> {
  value: T;
  label: string;
  hint?: string;
}

export interface ToolSetting {
  key: string;
  label: string;
  /** Short helper text rendered under the control. Must describe real behaviour. */
  help?: string;
  type: SettingFieldType;
  default: string | number | boolean;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Rendered only when the engine/browser reports this capability. */
  requiresCapability?: string;
  /** Group heading in the advanced-settings panel. */
  group?: 'Output' | 'Quality' | 'Layout' | 'Transform';
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ToolDefinition {
  /** Route segment and unique id, e.g. `jpg-to-png`. */
  slug: string;
  /** Human name, e.g. `JPG to PNG`. */
  name: string;
  /** `<title>` for the tool page. */
  title: string;
  /** Meta description + the sentence under the H1. */
  description: string;
  category: ToolCategory;
  kind: ToolKind;
  status: ToolStatus;
  engine: EngineId;
  /** Where the bytes are processed. Shown verbatim to the user. */
  processing: 'in-browser' | 'server';

  /** `accept` attribute for the file input, e.g. `.jpg,.jpeg,image/jpeg`. */
  accept: string[];
  /** Extensions (lower-case, with dot) this tool will actually open. */
  inputFormats: string[];
  /** Formats the user can pick as output. One entry = no selector shown. */
  outputFormats: string[];
  /** Pre-selected output when several exist. */
  defaultOutput?: string;

  /** Hard input limit for this tool (bytes). Must be <= SITE.limits.maxInputBytes. */
  maxInputBytes: number;
  /** Max files in one run. */
  maxFiles: number;
  /** Lucide icon name, resolved through `components/tool-icon.tsx`. */
  icon: string;
  /** Search keywords that are not already in the name/description. */
  tags: string[];

  settings: ToolSetting[];
  /** 3-step "How to use" list shown on the tool page. */
  steps: string[];
  faq: FaqItem[];
  /** Slugs of related tools rendered at the bottom of the page. */
  related: string[];
  /** Real, enforced limitations. Rendered as a bulleted "Good to know" list. */
  notes?: string[];
  /** Shown on the home page "Most used tools" strip. */
  popular?: boolean;
  /** Long-form SEO copy rendered below the tool. Plain paragraphs. */
  about?: { heading: string; body: string }[];
  /** Why a coming-soon tool is not available yet. Required for status=coming-soon. */
  plannedReason?: string;
}

/** A single file the user queued. */
export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  ext: string;
  status: FileStatus;
  /** Object URL for a preview, revoked when the file leaves the queue. */
  previewUrl?: string;
  /** Decoded intrinsic size for images, page count for PDFs. */
  meta?: { width?: number; height?: number; pages?: number; durationSec?: number };
  error?: string;
}

export type FileStatus = 'queued' | 'validating' | 'processing' | 'done' | 'failed' | 'cancelled';

export type RunStatus = 'idle' | 'ready' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** One produced file. A single input may produce several outputs (PDF -> JPG). */
export interface OutputFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  /** id of the QueuedFile it came from, when there is a 1:1 relationship. */
  sourceId?: string;
  sourceName?: string;
  sourceSize?: number;
  url?: string;
  meta?: { width?: number; height?: number; pages?: number; durationSec?: number };
}

export interface ProgressInfo {
  /** Completed units out of `total`. Real counts only — never random. */
  done: number;
  total: number;
  /** 0..1 when the engine can measure it, otherwise `null` (indeterminate bar). */
  ratio: number | null;
  /** Free-form status line, e.g. "Encoding frame 120". */
  label?: string;
}
