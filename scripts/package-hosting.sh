#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f out/index.html ]]; then
  echo "Static build not found. Run npm run build first." >&2
  exit 1
fi
STAGE="$ROOT/.package-build/ConvertFlow"
rm -rf "$ROOT/.package-build"
mkdir -p "$STAGE/upload-now" "$STAGE/source"
cp -a out/. "$STAGE/upload-now/"
# Copy the actual source and lockfile, excluding generated output, dependencies,
# ignored wasm cache, Git metadata, secrets, and the unrelated legacy archive.
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./out' \
  --exclude='./public/vendor' \
  --exclude='./.package-build' \
  --exclude='./coverage' \
  --exclude='./_public_html.zip' \
  --exclude='./ConvertFlow-hosting-package.zip' \
  --exclude='./*.tsbuildinfo' \
  --exclude='./.env.local' \
  --exclude='./.env.production' \
  -cf - . | tar -xf - -C "$STAGE/source"
cp README.md "$STAGE/README-START-HERE.txt"
cp DEPLOY-TO-CPANEL.txt "$STAGE/DEPLOY-TO-CPANEL.txt"
cp SEO-INDEXING-CHECKLIST.txt "$STAGE/SEO-INDEXING-CHECKLIST.txt"
cd "$ROOT/.package-build"
rm -f "$ROOT/ConvertFlow-hosting-package.zip"
zip -q -r -X "$ROOT/ConvertFlow-hosting-package.zip" ConvertFlow
cd "$ROOT"
printf '\nPackage created: %s\n' "$ROOT/ConvertFlow-hosting-package.zip"
ls -lh "$ROOT/ConvertFlow-hosting-package.zip"
printf 'Upload folder: ConvertFlow/upload-now/ (%s)\n' "$(du -sh "$STAGE/upload-now" | cut -f1)"
printf 'Source folder: ConvertFlow/source/ (%s)\n' "$(du -sh "$STAGE/source" | cut -f1)"
