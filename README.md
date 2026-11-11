# ConvertFlow

A free, responsive file-conversion and compression website. The production build is a **static export**: upload the contents of `out/` to Apache/cPanel `public_html` (or another static host). No Node.js runtime, database, accounts, paid conversion API, or file-upload backend is required.

> **Fastest route for hosting:** download `ConvertFlow-hosting-package.zip`, extract it, and upload everything inside `upload-now/` to your hosting account's `public_html/`. Read `DEPLOY-TO-CPANEL.txt` first. The `source/` folder is optional if you only want to deploy the prebuilt site.

## What works in this release

**23 ready-to-use routes** (only implemented tools receive pages and sitemap entries):

- **Images (10):** JPG↔PNG, WebP→JPG/PNG, JPG/PNG→WebP, Image Compressor, Image Resizer, Crop Image, Rotate Image.
- **PDF (7):** JPG/PNG→PDF, PDF→JPG, Merge PDF, Split PDF, Rotate PDF, Delete PDF Pages.
- **Video/audio (6):** MP4→MP3, MOV→MP4, WAV→MP3, Video Compressor, Audio Compressor, Video→GIF.

All selected files are processed within the browser tab. Image and PDF engines are loaded only when used. Audio/video uses the bundled FFmpeg WebAssembly single-thread worker; it is a large first download and can be slow or memory intensive on phones. Processing progress is based on engine events/duration when available; otherwise the UI is indeterminate. There is no random progress animation.

Eight future tools are explicitly labelled “Coming soon”; their pages are excluded from indexing and they have no conversion button: DOCX→PDF, PDF→Word, HEIC→JPG, PDF Compressor, EPUB conversions, RAR→ZIP, and OCR PDF.

Automated checks cover registry rules, image geometry and quality search, actual PDF merge/split/rotate/delete and PNG→PDF bytes, corrupt PDF errors, and generated FFmpeg command arguments. **An end-to-end browser run of every codec/device combination has not been completed.** Treat browser/codec compatibility as a real limitation and test the specific workflows you need before relying on them.

## Direct upload (no build required)

1. Download and extract `ConvertFlow-hosting-package.zip` on your computer.
2. Open the extracted `upload-now/` folder. In cPanel File Manager settings, enable “Show Hidden Files (dotfiles)” so `.htaccess` is visible.
3. Select **the contents** of `upload-now/`, including `index.html`, `_next/`, `vendor/`, `workers/`, `robots.txt`, `sitemap.xml`, `.htaccess`, and the route folders.
4. Upload those contents into the hosting document root, commonly `public_html/`. Do not upload the enclosing `upload-now` folder as a nested directory.
5. Visit your domain. Test `/jpg-to-png/`, `/merge-pdf/` and `/tools/`.

`trailingSlash: true` outputs each route as `route/index.html`; ordinary Apache/cPanel directory index handling serves these paths without a Next.js rewrite or Node process. The included `.htaccess` declares `.wasm` and `.mjs` MIME types used by the media and PDF workers. If your host rejects `.htaccess`, ask support to serve `.wasm` as `application/wasm` and `.mjs` as JavaScript; do not add a Node application just for these files.

The prebuilt package is configured for your supplied canonical domain, `https://convertio.si` (non-www). It includes page-specific canonical URLs, titles/descriptions, Open Graph/Twitter metadata, a sitemap, crawlable `noindex` handling for coming-soon content, JSON-LD, favicon, and HTTP/www-to-HTTPS redirects. Follow `SEO-INDEXING-CHECKLIST.txt` after upload to verify DNS/TLS and submit the sitemap in Google Search Console or Bing Webmaster Tools. Search engines control when pages are indexed; no build can guarantee inclusion or rankings. If a different canonical host is preferred, set `NEXT_PUBLIC_SITE_URL` before rebuilding and update the matching redirect hostname in `public/.htaccess`. Never put secrets in `NEXT_PUBLIC_*` variables: they are compiled into public files.

## Build from source / set your real domain

Requirements: Node.js 20.9+ (Node 22 LTS recommended) and npm. Hosting the generated files does not require Node.

From the extracted hosting ZIP, enter `ConvertFlow/source/`. From a repository checkout, run these commands at the repository root:

```bash
npm ci                    # installs locked dependencies and vendors worker assets
NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run build
```

Then upload the contents of the generated `out/` directory. On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_SITE_URL = "https://your-domain.example"
npm run build
```

Local development:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The source contains the complete static-site implementation; no environment variables are needed for local development. The production host receives static HTML, JavaScript, CSS, PDF.js assets, and the FFmpeg wasm assets only.

## Build-time settings

All settings are optional. Defaults live in `src/lib/site-config.ts`; **change the product name there once** or provide the matching environment variable before `npm run build`.

| Variable | Default | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SITE_NAME` | `Convertio` | Branding shown across the site |
| `NEXT_PUBLIC_SITE_TAGLINE` | built-in text | Short brand statement |
| `NEXT_PUBLIC_SITE_URL` | `https://convertio.si` | Canonical URL and sitemap origin; set to the preferred deployed origin |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `hello@convertio.si` | Public contact address shown on legal pages |
| `NEXT_PUBLIC_MAX_INPUT_MB` | `1024` | Global maximum accepted by the registry |
| `NEXT_PUBLIC_MAX_IMAGE_MB` | `64` | Image input limit |
| `NEXT_PUBLIC_MAX_PDF_MB` | `200` | PDF input limit |
| `NEXT_PUBLIC_MAX_MEDIA_MB` | `200` | Media file-picker limit; actual browser memory limits can still be lower |
| `NEXT_PUBLIC_MAX_FILES` | `20` | Maximum queued files (individual tools may set smaller limits) |
| `NEXT_PUBLIC_MEDIA_TIMEOUT_MIN` | `30` | FFmpeg job timeout |
| `NEXT_PUBLIC_ENABLE_MEDIA_TOOLS` | `1` | Set to `0` to hide FFmpeg tools |

These are **build-time** variables. Changing them on a static host after export does nothing; rebuild `out/` after changing them. `NEXT_PUBLIC_STATIC_EXPORT=0` is an escape hatch for a future real backend and is not needed for the shared-hosting package.

## Technical limits and costs

- **No user-file upload to ConvertFlow:** tools process in the browser. The optional home-page handoff uses IndexedDB in that browser for up to ten minutes and is deleted when consumed/expired.
- **Image tools:** canvas limits and device memory vary by browser. Very large pixel dimensions can fail even below the byte limit. Animated GIF/WebP become a still first frame. Browser codec support is probed; unsupported output formats are disabled or reported. EXIF metadata is removed when an image is re-encoded.
- **PDF:** encrypted/password-protected inputs are not supported in this release. PDF→image rasterizes each selected page and can use substantial memory. Interactive form fields are not preserved by merge. Page rotation is a PDF rotation flag.
- **Media:** the FFmpeg core is about 32 MB before browser caching. Single-thread wasm conversion can be slower than real time; input, decode buffers and output all consume memory. Codec/profile support varies, and DRM content is unsupported. The engine reports actual errors rather than changing file extensions. Mobile devices may need much smaller inputs.
- **No unlimited promise:** individual byte, count, timeout, browser-canvas and memory limits apply.
- **No subscriptions or paid API:** the software is free to use. Hosting, domain registration, storage, and bandwidth are still billed (or constrained) by the site owner’s provider. The first visit that uses media tools downloads a large wasm asset, so estimate bandwidth for your audience. This package does not guarantee that any host’s free tier will be sufficient.
- **Licensing:** the project is MIT-licensed, but bundled third-party assets retain their own licenses. In particular, the FFmpeg core build is GPL-2.0-or-later. Keep `THIRD_PARTY_NOTICES.md` and `LICENSES/` when redistributing. Review the notice before commercial redistribution.

## Tests and checks

```bash
npm test          # Vitest
npm run typecheck # TypeScript
npm run lint      # ESLint
npm run build     # static export into out/
```

The vendor script is run automatically after `npm ci` and can be run manually with `npm run vendor:wasm`. Large vendored copies in `public/vendor/` are generated and intentionally ignored by Git; the ready-to-upload copies are included in `out/` and in the hosting ZIP.

## Branding / internationalization

Edit `src/lib/site-config.ts` to change the name, tagline, URL, support address, and limits. Locale catalogs are prepared in `src/lib/i18n/catalog.ts` for English, Arabic and French; the complete interface in this release is English, with Arabic/French catalogs currently limited to navigation/status chrome.
