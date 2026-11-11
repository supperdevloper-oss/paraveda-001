#!/usr/bin/env node
/**
 * Vendors the large WASM assets that the browser engines need at runtime.
 *
 * These files ship inside npm packages but must be served from our own origin
 * (they are loaded by Web Workers / Emscripten and cannot go through the app
 * bundler). ~34 MB total, so they are copied into `public/vendor/` on install
 * and kept out of Git.
 *
 * Re-run any time: `npm run vendor:wasm`
 */
import { cp, mkdir, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'vendor');

/** Locate an installed package directory by walking up node_modules folders. */
function pkgDir(name) {
  const candidates = [
    path.join(root, 'node_modules', name),
    path.join(root, 'node_modules', '.pnpm'), // handled below
  ];
  for (const dir of candidates) {
    if (dir.endsWith('.pnpm')) continue;
    try {
      // Sync-ish existence probe via statSync would need another import; use a
      // cheap trick: require.resolve is avoided because package "exports" maps
      // often hide package.json. We just return the path and let copy() verify.
      return dir;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function copy(from, to, label) {
  if (!(await exists(from))) {
    console.warn(`  ! skipped ${label}: ${path.relative(root, from)} not found`);
    return false;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`  + ${label} -> ${path.relative(root, to)}`);
  return true;
}

async function main() {
  console.log('[vendor] preparing browser WASM assets');
  await mkdir(outDir, { recursive: true });

  let ok = 0;
  const total = 6;

  const pdfjs = pkgDir('pdfjs-dist');
  ok += (await copy(path.join(pdfjs, 'build', 'pdf.worker.min.mjs'), path.join(outDir, 'pdfjs', 'pdf.worker.min.mjs'), 'pdfjs worker')) ? 1 : 0;
  ok += (await copy(path.join(pdfjs, 'standard_fonts'), path.join(outDir, 'pdfjs', 'standard_fonts'), 'pdfjs standard fonts')) ? 1 : 0;
  ok += (await copy(path.join(pdfjs, 'cmaps'), path.join(outDir, 'pdfjs', 'cmaps'), 'pdfjs cmaps')) ? 1 : 0;
  ok += (await copy(path.join(pdfjs, 'iccs'), path.join(outDir, 'pdfjs', 'iccs'), 'pdfjs icc profiles')) ? 1 : 0;

  const ffmpeg = pkgDir('@ffmpeg/ffmpeg');
  ok += (await copy(path.join(ffmpeg, 'dist', 'esm'), path.join(outDir, 'ffmpeg', 'esm'), 'ffmpeg class worker')) ? 1 : 0;

  const core = pkgDir('@ffmpeg/core');
  // The ESM build is the one the module worker can `import()`; the .wasm is
  // byte-identical to the UMD build, so vendoring only esm/ halves the size.
  ok += (await copy(path.join(core, 'dist', 'esm'), path.join(outDir, 'ffmpeg', 'core'), 'ffmpeg core (~32 MB)')) ? 1 : 0;

  await writeFile(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), ok, total }, null, 2),
  );
  await writeFile(path.join(outDir, '.gitignore'), '*\n!.gitignore\n!manifest.json\n');

  const entries = await readdir(outDir);
  console.log(`[vendor] done (${ok}/${total} groups): ${entries.join(', ')}`);
  if (ok < total) console.warn('[vendor] some assets are missing - re-run `npm install`.');
}

main().catch((err) => {
  console.error('[vendor] failed:', err?.message || err);
  process.exit(0); // non-fatal: non-WASM tools still work
});
