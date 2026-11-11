import { SITE } from '../site-config';
import type { ToolCategory, ToolDefinition, ToolStatus } from './types';
import { IMAGE_TOOLS } from './image-tools';
import { PDF_TOOLS } from './pdf-tools';
import { MEDIA_TOOLS } from './media-tools';
import { PLANNED_TOOLS } from './planned-tools';

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  blurb: string;
  icon: string;
  order: number;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'images', label: 'Images', blurb: 'Convert, compress, resize, crop and rotate pictures.', icon: 'image', order: 1 },
  { id: 'pdf', label: 'PDF', blurb: 'Merge, split, rotate, remove pages and turn PDFs into images.', icon: 'file-text', order: 2 },
  { id: 'video', label: 'Video', blurb: 'Convert and shrink video, or turn a clip into a GIF.', icon: 'video', order: 3 },
  { id: 'audio', label: 'Audio', blurb: 'Extract audio from video and compress sound files.', icon: 'music', order: 4 },
  { id: 'documents', label: 'Documents', blurb: 'Office documents and e-books. Planned — see the roadmap.', icon: 'book-open', order: 5 },
];

export const CATEGORY_MAP: Record<ToolCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<ToolCategory, CategoryMeta>;

/* -------------------------------------------------------------------------- */
/* The registry                                                               */
/* -------------------------------------------------------------------------- */

const ALL: ToolDefinition[] = [
  ...IMAGE_TOOLS,
  ...PDF_TOOLS,
  // Media tools depend on ffmpeg.wasm; the flag lets a deployment disable them
  // without leaving dead buttons behind.
  ...(SITE.features.mediaTools ? MEDIA_TOOLS : MEDIA_TOOLS.map((t) => ({ ...t, status: 'coming-soon' as ToolStatus }))),
  ...PLANNED_TOOLS,
];

/** Every tool, ready or planned. */
export const TOOLS: readonly ToolDefinition[] = Object.freeze(ALL);

/** Tools that actually work: they get a route, a menu entry and a sitemap URL. */
export const READY_TOOLS: readonly ToolDefinition[] = Object.freeze(ALL.filter((t) => t.status === 'ready'));

/** Tools listed on /coming-soon. Never routed, never indexed. */
export const COMING_SOON_TOOLS: readonly ToolDefinition[] = Object.freeze(ALL.filter((t) => t.status === 'coming-soon'));

const BY_SLUG = new Map(ALL.map((t) => [t.slug, t]));

export function getTool(slug: string | undefined | null): ToolDefinition | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug);
}

/** A tool only has a page when it is implemented. */
export function getRoutableTool(slug: string | undefined | null): ToolDefinition | undefined {
  const tool = getTool(slug);
  return tool && tool.status === 'ready' ? tool : undefined;
}

export function toolsByCategory(category: ToolCategory, status: ToolStatus = 'ready'): ToolDefinition[] {
  return ALL.filter((t) => t.category === category && t.status === status).sort((a, b) => a.name.localeCompare(b.name));
}

export function readyToolsByCategory(): { category: CategoryMeta; tools: ToolDefinition[] }[] {
  return CATEGORIES.map((category) => ({ category, tools: toolsByCategory(category.id, 'ready') })).filter(
    (g) => g.tools.length > 0,
  );
}

export function popularTools(limit = 8): ToolDefinition[] {
  const flagged = READY_TOOLS.filter((t) => t.popular);
  if (flagged.length >= limit) return [...flagged].slice(0, limit);
  return [...flagged, ...READY_TOOLS.filter((t) => !t.popular)].slice(0, limit);
}

export function relatedTools(tool: ToolDefinition, limit = 4): ToolDefinition[] {
  const direct = tool.related.map((s) => BY_SLUG.get(s)).filter((t): t is ToolDefinition => !!t && t.status === 'ready');
  if (direct.length >= limit) return direct.slice(0, limit);
  const sameCategory = READY_TOOLS.filter(
    (t) => t.category === tool.category && t.slug !== tool.slug && !direct.some((d) => d.slug === t.slug),
  );
  return [...direct, ...sameCategory].slice(0, limit);
}

/** All slugs that produce a page. Used by generateStaticParams and the sitemap. */
export function routableSlugs(): string[] {
  return READY_TOOLS.map((t) => t.slug);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

function haystack(tool: ToolDefinition): string {
  return [
    tool.name,
    tool.slug,
    tool.description,
    tool.category,
    tool.kind,
    tool.inputFormats.join(' '),
    tool.outputFormats.join(' '),
    tool.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

const HAYSTACKS = new Map(ALL.map((t) => [t.slug, haystack(t)]));

/**
 * Simple, dependency-free relevance ranking: name prefix > name word >
 * tag > description. Good enough for ~30 tools and fully deterministic.
 */
export function searchTools(query: string, { includePlanned = false }: { includePlanned?: boolean } = {}): ToolDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const pool = includePlanned ? ALL : READY_TOOLS;

  const scored: { tool: ToolDefinition; score: number }[] = [];
  for (const tool of pool) {
    const hay = HAYSTACKS.get(tool.slug) ?? haystack(tool);
    const name = tool.name.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (name.startsWith(term)) score += 100;
      else if (name.includes(term)) score += 60;
      else if (tool.slug.includes(term)) score += 40;
      else if (tool.tags.some((t) => t.toLowerCase().includes(term))) score += 25;
      else if (hay.includes(term)) score += 10;
      else {
        score = -1;
        break;
      }
    }
    if (score > 0) scored.push({ tool, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name)).map((s) => s.tool);
}

/* -------------------------------------------------------------------------- */
/* Integrity checks — run in unit tests and at build time                     */
/* -------------------------------------------------------------------------- */

export interface RegistryIssue {
  slug: string;
  problem: string;
}

export function validateRegistry(): RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  const seen = new Set<string>();

  for (const tool of ALL) {
    const at = (problem: string) => issues.push({ slug: tool.slug, problem });

    if (!tool.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) at(`invalid slug "${tool.slug}"`);
    if (seen.has(tool.slug)) at('duplicate slug');
    seen.add(tool.slug);

    // Reserved Next.js segments must never become a tool route.
    if (['tools', 'about', 'privacy', 'terms', 'coming-soon', 'api', 'search'].includes(tool.slug)) {
      at(`slug collides with a site section: ${tool.slug}`);
    }

    if (!tool.name) at('missing name');
    if (!tool.title) at('missing title');
    if (!tool.description) at('missing description');
    if (tool.title.length > 70) at(`title is ${tool.title.length} chars (keep <= 70 for search results)`);
    if (tool.description.length > 170) at(`description is ${tool.description.length} chars (keep <= 170)`);

    if (tool.status === 'ready') {
      if (!tool.accept.length) at('ready tool has no accept list');
      if (!tool.inputFormats.length) at('ready tool has no input formats');
      if (!tool.outputFormats.length) at('ready tool has no output formats');
      if (!tool.steps.length) at('ready tool has no steps');
      if (!tool.faq.length) at('ready tool has no FAQ');
      if (!tool.maxInputBytes || tool.maxInputBytes > SITE.limits.maxInputBytes) {
        at(`maxInputBytes ${tool.maxInputBytes} exceeds the global limit ${SITE.limits.maxInputBytes}`);
      }
      if (tool.maxFiles < 1 || tool.maxFiles > SITE.limits.maxFilesPerRun) {
        at(`maxFiles ${tool.maxFiles} outside 1..${SITE.limits.maxFilesPerRun}`);
      }
      if (tool.processing !== 'in-browser') at('a ready tool must run in the browser in this release');
      const keys = new Set<string>();
      for (const s of tool.settings) {
        if (keys.has(s.key)) at(`duplicate setting key "${s.key}"`);
        keys.add(s.key);
        if (!s.label) at(`setting "${s.key}" has no label`);
        if (s.default === undefined || s.default === null) at(`setting "${s.key}" has no default`);
        if (s.type === 'select' && (!s.options || s.options.length < 2)) at(`select "${s.key}" needs at least 2 options`);
        if (s.type === 'select' && s.options && !s.options.some((o) => o.value === s.default)) {
          at(`select "${s.key}" default "${String(s.default)}" is not one of its options`);
        }
      }
      for (const rel of tool.related) {
        const target = BY_SLUG.get(rel);
        if (!target) at(`related tool "${rel}" does not exist`);
        else if (target.status !== 'ready') at(`related tool "${rel}" is not implemented yet`);
      }
      for (const f of tool.faq) {
        if (!f.q || !f.a) at('FAQ item with an empty question or answer');
      }
    }

    if (tool.status === 'coming-soon') {
      if (!tool.plannedReason || tool.plannedReason.length < 40) at('coming-soon tool must explain why it is unavailable');
      if (tool.settings.length) at('coming-soon tool must not expose settings');
    }
  }

  return issues;
}

/** Throws at build/test time if the registry is inconsistent. */
export function assertValidRegistry(): void {
  const issues = validateRegistry();
  if (issues.length) {
    throw new Error(`Tool registry problems:\n${issues.map((i) => `  - ${i.slug}: ${i.problem}`).join('\n')}`);
  }
}
