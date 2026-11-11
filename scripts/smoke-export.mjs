#!/usr/bin/env node
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('out');
const exists = async (p) => { try { await access(path.join(root, p)); return true; } catch { return false; } };
const ready = [
  'jpg-to-png','png-to-jpg','webp-to-jpg','webp-to-png','jpg-to-webp','png-to-webp',
  'image-compressor','image-resizer','crop-image','rotate-image','jpg-to-pdf','png-to-pdf',
  'pdf-to-jpg','merge-pdf','split-pdf','rotate-pdf','delete-pdf-pages','mp4-to-mp3',
  'mov-to-mp4','wav-to-mp3','video-compressor','audio-compressor','video-to-gif',
];
for (const route of ['index.html','tools/index.html','about/index.html','privacy/index.html','terms/index.html','coming-soon/index.html','robots.txt','sitemap.xml','workers/image.worker.js','vendor/pdfjs/pdf.worker.min.mjs','vendor/ffmpeg/esm/worker.js','vendor/ffmpeg/core/ffmpeg-core.js','vendor/ffmpeg/core/ffmpeg-core.wasm','.htaccess','favicon.svg','og-image.png']) {
  assert(await exists(route), `Missing static export asset: ${route}`);
}
for (const slug of ready) assert(await exists(`${slug}/index.html`), `Missing ready tool route: ${slug}`);
for (const slug of ['docx-to-pdf','pdf-to-word','heic-to-jpg','pdf-compressor','epub-to-pdf','pdf-to-epub','rar-to-zip','ocr-pdf']) {
  assert(!(await exists(`${slug}/index.html`)), `Coming-soon tool must not have an indexed route: ${slug}`);
}
const html = await readFile(path.join(root,'index.html'),'utf8');
assert.match(html, /Convert Your Files for Free/);
const robots = await readFile(path.join(root,'robots.txt'),'utf8');
assert.match(robots, /Allow: \/\s*$/m);
assert.doesNotMatch(robots, /Disallow: \/coming-soon\//);
const plannedPage=await readFile(path.join(root,'coming-soon/index.html'),'utf8');
assert.match(plannedPage, /noindex/i, 'Coming-soon content must remain noindex while crawlable so engines can see the directive.');
const sitemap = await readFile(path.join(root,'sitemap.xml'),'utf8');
const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://convertio.si').replace(/\/+$/,'');
assert(sitemap.includes(`<loc>${origin}/</loc>`), `Sitemap must use the canonical site origin ${origin}`);
assert(html.includes(`${origin}/`), `Homepage canonical must use ${origin}`);
for (const slug of ready) assert(sitemap.includes(`/${slug}/`), `Sitemap is missing ${slug}`);
for (const route of ['', 'tools','about','privacy','terms','coming-soon',...ready]) {
  const htmlPath=route?`${route}/index.html`:'index.html';
  const page=await readFile(path.join(root,htmlPath),'utf8');
  const canonical=page.match(/<link rel=\"canonical\" href=\"([^\"]+)\"/);
  const expected=`${origin}/${route?`${route}/`:''}`;
  assert.equal(canonical?.[1],expected,`${htmlPath} must have its own absolute canonical URL`);
  const ogUrl=page.match(/<meta property=\"og:url\" content=\"([^\"]+)\"/);
  assert.equal(ogUrl?.[1],expected,`${htmlPath} Open Graph URL must match its canonical URL`);
  assert(page.includes(`${origin}/og-image.png`),`${htmlPath} must include an absolute social-preview image URL`);
}
assert(!sitemap.includes('/pdf-to-word/'), 'Coming-soon routes must not be in the sitemap');
const wasm = await stat(path.join(root,'vendor/ffmpeg/core/ffmpeg-core.wasm'));
assert(wasm.size > 30_000_000, 'FFmpeg wasm looks incomplete');
console.log(`Static export smoke check passed: ${ready.length} tool routes, no planned routes, ${Math.round(wasm.size/1024/1024)} MB FFmpeg core.`);
