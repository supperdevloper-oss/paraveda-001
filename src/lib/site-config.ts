/**
 * ---------------------------------------------------------------------------
 * Convertio — single source of truth for branding, domain and global limits
 * ---------------------------------------------------------------------------
 * Rebranding the whole site means editing THIS file (or setting the matching
 * environment variable). Nothing else hard-codes the product name.
 *
 *   NEXT_PUBLIC_SITE_NAME      -> site.name
 *   NEXT_PUBLIC_SITE_TAGLINE   -> site.tagline
 *   NEXT_PUBLIC_SITE_URL       -> site.url      (used for canonical + sitemap)
 *   NEXT_PUBLIC_SUPPORT_EMAIL  -> site.supportEmail
 */

export interface SiteConfig {
  /** Product name shown in the header, footer, <title> and structured data. */
  name: string;
  /** Lower-case, URL-safe form of the name (used for file naming, IDs). */
  slug: string;
  /** One-line value proposition. */
  tagline: string;
  /** Longer description used on the home page and as the default meta description. */
  description: string;
  /** Absolute origin, no trailing slash. Required for canonical URLs + sitemap. */
  url: string;
  /** Default interface language (BCP-47). */
  defaultLocale: string;
  /** Locales that are wired up and selectable. */
  locales: readonly string[];
  supportEmail: string;
  /** GitHub/npm style links used in the footer. Empty strings are hidden. */
  links: {
    sourceRepository: string;
    status: string;
  };
  /** Year shown in the copyright line. */
  copyrightYear: number;
  /**
   * Honest, enforced global limits. Individual tools may declare tighter
   * limits in the tool registry; nothing may exceed these.
   */
  limits: {
    /** Largest single input file accepted by any tool (bytes). */
    maxInputBytes: number;
    /** Largest single input file accepted by the WASM/ffmpeg tools (bytes). */
    maxMediaInputBytes: number;
    /** Largest single input file accepted by the PDF tools (bytes). */
    maxPdfInputBytes: number;
    /** Largest single input file accepted by the image tools (bytes). */
    maxImageInputBytes: number;
    /** Largest number of files that can be queued in one run. */
    maxFilesPerRun: number;
    /** Longest a single WASM job may run before it is aborted (ms). */
    mediaJobTimeoutMs: number;
  };
  /** Feature flags — keep disabled features from showing working buttons. */
  features: {
    /** Google Drive / Dropbox / OneDrive / URL import are NOT implemented. */
    remoteImport: false;
    /** Server-side conversion backend. Not implemented in this release. */
    serverProcessing: false;
    /** Account system, quotas, billing. Deliberately absent. */
    accounts: false;
    /** ffmpeg.wasm based tools (video/audio). */
    mediaTools: boolean;
    /** Show the /coming-soon page in the footer navigation. */
    comingSoonPage: boolean;
    /** Show the language switcher (ar/fr catalogs are partial previews). */
    languageSwitcher: boolean;
  };
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MB = 1024 * 1024;

export const SITE: SiteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'Convertio',
  slug: 'convertio',
  tagline:
    process.env.NEXT_PUBLIC_SITE_TAGLINE?.trim() ||
    'Free file conversion and compression, processed in your browser.',
  description:
    'Free online file converter for images, PDFs, video and audio. Convert in your browser with no sign-up or watermark, and keep your files on your device.',
  // Canonical origin of the user's production site; override at build time if needed.
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://convertio.si').replace(/\/+$/, ''),
  defaultLocale: 'en',
  locales: ['en', 'ar', 'fr'] as const,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'hello@convertio.si',
  links: {
    sourceRepository: '',
    status: '',
  },
  copyrightYear: new Date().getFullYear(),
  limits: {
    maxInputBytes: num(process.env.NEXT_PUBLIC_MAX_INPUT_MB, 1024) * MB,
    maxMediaInputBytes: num(process.env.NEXT_PUBLIC_MAX_MEDIA_MB, 200) * MB,
    maxPdfInputBytes: num(process.env.NEXT_PUBLIC_MAX_PDF_MB, 200) * MB,
    maxImageInputBytes: num(process.env.NEXT_PUBLIC_MAX_IMAGE_MB, 64) * MB,
    maxFilesPerRun: num(process.env.NEXT_PUBLIC_MAX_FILES, 20),
    mediaJobTimeoutMs: num(process.env.NEXT_PUBLIC_MEDIA_TIMEOUT_MIN, 30) * 60_000,
  },
  features: {
    remoteImport: false,
    serverProcessing: false,
    accounts: false,
    mediaTools: process.env.NEXT_PUBLIC_ENABLE_MEDIA_TOOLS !== '0',
    comingSoonPage: true,
    languageSwitcher: true,
  },
};

/** Convenience: `https://convertio.si` -> `new URL(...)` for metadataBase. */
export function siteUrl(path = '/'): string {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export default SITE;
