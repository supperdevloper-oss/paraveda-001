import { describe, it, expect } from 'vitest';
import {
  TOOLS,
  READY_TOOLS,
  COMING_SOON_TOOLS,
  getTool,
  getRoutableTool,
  searchTools,
  validateRegistry,
  relatedTools,
  toolsByCategory,
  CATEGORIES,
} from '@/lib/tools/registry';
import { SITE } from '@/lib/site-config';

describe('tool registry', () => {
  it('is internally consistent', () => {
    const issues = validateRegistry();
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  it('contains the phase-1 tools the brief requires', () => {
    const required = [
      'jpg-to-png',
      'png-to-jpg',
      'webp-to-jpg',
      'webp-to-png',
      'jpg-to-webp',
      'image-compressor',
      'image-resizer',
      'crop-image',
      'rotate-image',
      'jpg-to-pdf',
      'pdf-to-jpg',
      'merge-pdf',
      'split-pdf',
      'rotate-pdf',
      'delete-pdf-pages',
    ];
    for (const slug of required) {
      const tool = getTool(slug);
      expect(tool, `${slug} is missing from the registry`).toBeDefined();
      expect(tool!.status, `${slug} should be implemented`).toBe('ready');
    }
  });

  it('has unique slugs and every category is a known one', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const tool of TOOLS) expect(ids.has(tool.category)).toBe(true);
  });

  it('never routes a coming-soon tool', () => {
    for (const tool of COMING_SOON_TOOLS) {
      expect(getRoutableTool(tool.slug)).toBeUndefined();
      expect(tool.plannedReason!.length).toBeGreaterThan(40);
    }
    for (const tool of READY_TOOLS) {
      expect(getRoutableTool(tool.slug)).toBe(tool);
    }
  });

  it('respects the global limits from site config', () => {
    for (const tool of READY_TOOLS) {
      expect(tool.maxInputBytes).toBeLessThanOrEqual(SITE.limits.maxInputBytes);
      expect(tool.maxFiles).toBeLessThanOrEqual(SITE.limits.maxFilesPerRun);
      expect(tool.processing).toBe('in-browser');
    }
  });

  it('only links to related tools that exist and work', () => {
    for (const tool of READY_TOOLS) {
      for (const slug of tool.related) {
        const rel = getTool(slug);
        expect(rel, `${tool.slug} -> ${slug}`).toBeDefined();
        expect(rel!.status).toBe('ready');
      }
      expect(relatedTools(tool).length).toBeGreaterThan(0);
    }
  });

  it('searches by name, slug and tag', () => {
    expect(searchTools('jpg to png')[0]!.slug).toBe('jpg-to-png');
    expect(searchTools('merge').some((t) => t.slug === 'merge-pdf')).toBe(true);
    expect(searchTools('compress').length).toBeGreaterThan(1);
    expect(searchTools('gif').some((t) => t.slug === 'video-to-gif')).toBe(true);
    // planned tools are hidden from search unless explicitly requested
    expect(searchTools('docx')).toEqual([]);
    expect(searchTools('docx', { includePlanned: true }).some((t) => t.slug === 'docx-to-pdf')).toBe(true);
    expect(searchTools('')).toEqual([]);
    expect(searchTools('zzzznotatool')).toEqual([]);
  });

  it('groups tools by category', () => {
    expect(toolsByCategory('pdf').length).toBeGreaterThanOrEqual(5);
    expect(toolsByCategory('images').length).toBeGreaterThanOrEqual(5);
    expect(toolsByCategory('documents', 'ready')).toEqual([]);
  });
});
