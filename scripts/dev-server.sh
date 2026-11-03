#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Paraveda CRM — معاينة محلية (dev preview)
#
#  كيشغل api.php + index.html بـ PHP built-in server على 0.0.0.0:$PORT
#  باش تقدر تشوف الموقع وتعدل عليه. الـ router كيطبق قواعد .htaccess
#  (الملفات الحساسة مسدودة، /backups/ 404، إلخ).
#
#  الاستعمال:   ./scripts/dev-server.sh          (port 8080 by default)
#               PORT=9000 ./scripts/dev-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
PHP="${PV_PHP:-/tmp/php83/php}"

# ── 1) PHP binary (static, musl) ────────────────────────────────────────────
if [ ! -x "$PHP" ]; then
  echo "→ PHP ما كاينش فـ $PHP — كنحملو نسخة static..."
  TMP="$(mktemp -d)"
  git clone --quiet --filter=blob:none --no-checkout --depth 1 \
      --branch 1.2.0 https://github.com/nativephp/php-bin.git "$TMP/php-bin"
  git -C "$TMP/php-bin" sparse-checkout init --cone
  git -C "$TMP/php-bin" sparse-checkout set bin/linux/x64
  git -C "$TMP/php-bin" checkout --quiet 1.2.0
  mkdir -p "$(dirname "$PHP")"
  unzip -o -q "$TMP/php-bin/bin/linux/x64/php-8.3.zip" -d "$(dirname "$PHP")"
  rm -rf "$TMP"
  echo "✓ PHP جاهز: $("$PHP" -v | head -1)"
fi

# ── 2) dev guard: بلا محاولات Digylog (الشبكة مسدودة فالمعاينة) ─────────────
touch "$ROOT/public_html/.dev-nosend"

# ── 3) تشغيل السيرفر ───────────────────────────────────────────────────────
echo "→ Paraveda CRM على http://0.0.0.0:$PORT  (docroot: public_html)"
cd "$ROOT"
exec env PHP_CLI_SERVER_WORKERS="${WORKERS:-8}" "$PHP" \
  -d display_errors=0 -d log_errors=1 -d error_log=/tmp/php-err.log \
  -d upload_max_filesize=32M -d post_max_size=32M -d memory_limit=512M \
  -S "0.0.0.0:$PORT" -t public_html scripts/router.php
