import type { NextConfig } from 'next';

/**
 * ConvertFlow is 100% client-side, so the production build is a plain static
 * site: `npm run build` writes `out/`, which can be uploaded to any host
 * (cPanel `public_html`, Netlify, Cloudflare Pages, GitHub Pages, S3...).
 *
 * No Node runtime, no serverless functions, no database. Set
 * `NEXT_PUBLIC_STATIC_EXPORT=0` only if you later add a real backend.
 */
const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT !== '0';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The sandbox / staging preview proxies the dev server under a generated host.
  allowedDevOrigins: ['*.e2b.app', 'localhost', '127.0.0.1'],
  // Trailing slashes produce `slug/index.html`, which Apache and nginx serve
  // for `/slug/` without any rewrite rules — important on shared hosting.
  trailingSlash: true,
  images: { unoptimized: true },
  // No custom Turbopack transform is required; this explicitly acknowledges
  // Next 16's default bundler while retaining webpack fallbacks for consumers.
  turbopack: {},

  ...(staticExport
    ? {
        output: 'export' as const,
        // Static export writes `out/`; distDir stays `.next` for the build cache.
        distDir: '.next',
      }
    : {}),

  webpack: (config) => {
    // pdf.js optionally requires Node-only packages when bundled for a server.
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      module: false,
    };
    return config;
  },
};

export default nextConfig;
