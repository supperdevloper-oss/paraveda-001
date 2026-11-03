<?php
/**
 * Dev router for PHP's built-in server (php -S).
 * Emulates the important parts of public_html/.htaccess so the preview
 * behaves like production:
 *   - sensitive data/config/log files are not served over HTTP
 *   - /backups/ → 404, /digylog-chat.html → 410
 *   - admin-only scripts refused
 */

$root = __DIR__ . '/../public_html';
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rawurldecode(ltrim($uri, '/'));

// ── deny list (same family as .htaccess) ─────────────────────────────────
$denyFiles = [
    'crm_data.json', 'crm_data.json.backup', 'digylog_cfg.json',
    'audit.log', 'audit.log.1', 'journal.log', 'journal.log.1',
    'install.txt', 'push_keys.json', 'push_subs.json',
    'import.php', 'manual_sync.php', 'recover.php', 'dino.html',
];
// Note: dl-diag.json stays public on purpose (production .htaccess allows it too).
$denyPrefixes = ['backups/', '.crm.', '.dl.', '.dl-', '.delivery-', '.tracking-',
                 '.city-price-', '.commission-'];
$denySuffixes = ['.tmp', '.lock', '.stamp', '.etag'];

$base = strtolower(basename($path));
$denied = in_array($base, $denyFiles, true) || substr($base, -5) === '.lock';
foreach ($denyPrefixes as $p) {
    if (strpos(strtolower($path), $p) === 0) { $denied = true; }
}
foreach ($denySuffixes as $s) {
    if (substr($base, -strlen($s)) === $s) { $denied = true; }
}

if ($denied) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "403 — ملف محمي (dev router يفعل نفس قاعدة .htaccess)\n";
    return true;
}

if ($path === 'digylog-chat.html') {
    http_response_code(410);
    echo "410 gone";
    return true;
}

// Directory → index.html
$full = $root . '/' . $path;
if ($path === '' || is_dir($full)) {
    $index = rtrim($full, '/') . '/index.html';
    if (is_file($index)) {
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-cache, must-revalidate');
        readfile($index);
        return true;
    }
}

// Everything else: let php -S handle it (static files served, .php executed)
return false;
