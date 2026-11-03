#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# Paraveda CRM — الوضع الليلي للصفحات المستقلة (retours / quick / digylog…)
#
# هاد الصفحات ماشي SPA: عندهم CSS خاص بهم (وأغلبهم كيتحمّل داخل iframe من
# index.html). هاد السكريبت كيقرا CSS ديال كل صفحة وكيولّد نسخة غامقة:
#   • ألوان الخلفية الفاتحة  → سطوح غامقة (بالاحتفاظ بالصبغة)
#   • ألوان النص الغامقة     → فاتحة
#   • الحدود الفاتحة         → حدود غامقة
#   • متغيرات CSS (:root)    → قيم غامقة حسب الاسم
# وكيدزها + boot script فـ كل صفحة بين markers (idempotent).
#
# التشغيل:  python3 scripts/build-dark-pages.py [--check]
# ─────────────────────────────────────────────────────────────────────────────
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public_html'

PAGES = ['retours.html', 'quick.html', 'digylog-admin.html', 'digylog-chat.html', 'dino.html']

BG = '#0a1120'
SURF = '#16233a'
SURF2 = '#1b2a44'
BORDER = '#2b3a56'
TEXT = '#e8eef7'
TEXT2 = '#c6d2e2'
MUTED = '#93a4bd'
ACCENT_TEXT = '#f0c674'

BEGIN = '<!--PV-DARK-PAGES:BEGIN-->'
END = '<!--PV-DARK-PAGES:END-->'


# ── HSL helpers (نفس منطق build-dark-css.py) ─────────────────────────────────
def _rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hsl(h):
    r, g, b = [v / 255 for v in _rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60, s, l


def lum(h):
    r, g, b = _rgb(h)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


def recolor(h, light, smin=0.32, smax=0.58):
    hh, s, _ = _hsl(h)
    s = max(smin, min(smax, s))
    return 'hsl(%.0f, %.0f%%, %.0f%%)' % (hh, s * 100, light * 100)


COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)')


def first_color(value):
    m = COLOR_RE.search(value)
    return m.group(0) if m else None


def to_hex(c):
    """رجّع #rrggbb من hex/rgb (بلا alpha) أو None."""
    if c.startswith('#'):
        h = c.lstrip('#')
        if len(h) == 3:
            h = ''.join(x * 2 for x in h)
        if len(h) >= 6:
            return '#' + h[:6].lower()
        return None
    m = re.match(r'rgba?\(\s*(\d+)\W+(\d+)\W+(\d+)', c)
    if m:
        return '#%02x%02x%02x' % tuple(int(x) for x in m.groups())
    return None


# ── CSS mini-parser ─────────────────────────────────────────────────────────
def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def iter_rules(css, at=None):
    css = css
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j == -1:
            break
        prelude = css[i:j].strip()
        depth, k = 0, j
        while k < n:
            if css[k] == '{':
                depth += 1
            elif css[k] == '}':
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = css[j + 1:k]
        if prelude.startswith('@'):
            if prelude.startswith('@media') or prelude.startswith('@supports'):
                yield from iter_rules(body, prelude)
        elif prelude:
            yield prelude, body, at
        i = k + 1


DECL_RE = re.compile(r'([-\w]+)\s*:\s*([^;]+)', re.S)


def parse_decls(body):
    out = []
    for m in DECL_RE.finditer(body):
        out.append((m.group(1).strip(), m.group(2).strip()))
    return out


# ── تحويل لون حسب الخاصية ───────────────────────────────────────────────────
def dark_value(prop, color):
    """رجّع اللون الغامق المناسب أو None إلا ما خاصناش نبدلو."""
    hexv = to_hex(color)
    if not hexv:
        return None
    l = lum(hexv)
    if prop in ('background', 'background-color'):
        if l < 0.42:
            return None                     # غامق أصلاً
        hue, sat, _ = _hsl(hexv)
        if sat < 0.08:                      # رمادي/أبيض → سطح
            return SURF if l >= 0.96 else SURF2
        return recolor(hexv, 0.17)          # لون دلالي (حالة) → نفس الصبغة
    if prop == 'color':
        if l > 0.55:
            return None                     # فاتح أصلاً
        hue, sat, _ = _hsl(hexv)
        if sat < 0.10:                      # رمادي → نصوص عادية
            return TEXT if l < 0.14 else (TEXT2 if l < 0.30 else MUTED)
        return recolor(hexv, 0.72, 0.45, 0.85)
    if prop.startswith('border'):
        if l < 0.55:
            return None
        return BORDER
    return None


VAR_KIND = [
    (re.compile(r'(^|-)bg($|-)|background|card|panel|surface|paper|sheet', re.I), 'surface'),
    (re.compile(r'text|ink|fg|title|heading', re.I), 'text'),
    (re.compile(r'muted|sub|dim|hint|placeholder', re.I), 'muted'),
    (re.compile(r'line|border|bd|divider|stroke', re.I), 'line'),
]


def dark_var(name, value):
    color = first_color(value)
    if not color:
        return None
    hexv = to_hex(color)
    if not hexv:
        return None
    l = lum(hexv)
    for rx, kind in VAR_KIND:
        if rx.search(name):
            if kind == 'surface':
                if name.strip('-').lower() in ('bg', 'background', 'page-bg', 'body-bg'):
                    return BG
                return SURF if l >= 0.88 else (SURF2 if l >= 0.6 else None)
            if kind == 'text':
                return TEXT if l <= 0.55 else None
            if kind == 'muted':
                return MUTED if l <= 0.6 else None
            if kind == 'line':
                return BORDER if l >= 0.55 else None
    return None


def build_css(files_css):
    """files_css: [(page, css_text)] → نص CSS غامق مشترك."""
    var_map = {}      # --x -> dark value
    blocks = []       # (selector, [decls], at)

    for page, css in files_css:
        css = strip_comments(css)
        for sel, body, at in iter_rules(css):
            decls = parse_decls(body)
            dark = []
            for prop, val in decls:
                if prop.startswith('--'):
                    dv = dark_var(prop, val)
                    if dv and prop not in var_map:
                        var_map[prop] = dv
                    continue
                if 'var(' in val or 'gradient' in val:
                    continue
                if prop in ('background', 'background-color', 'color') or prop.startswith('border'):
                    c = first_color(val)
                    if not c:
                        continue
                    dv = dark_value(prop, c)
                    if dv:
                        dark.append((prop, dv))
            if dark:
                sels = [s.strip() for s in sel.split(',') if s.strip()]
                if any(s.startswith((':root', 'html', 'body')) or s == '*' for s in sels):
                    continue    # المتغيرات كتتكفل بها
                blocks.append((sels, dark, at))

    out = ['/* ══════════════════════════════════════════════════════════════',
           '   Paraveda — الوضع الليلي للصفحات المستقلة (مُولّد آلياً)',
           '   ما تعدلش هاد الملف بيدك: python3 scripts/build-dark-pages.py',
           '   ══════════════════════════════════════════════════════════════ */',
           '']

    # 1) المتغيرات
    if var_map:
        out.append('html[data-pv-theme="dark"]{')
        for k, v in sorted(var_map.items()):
            out.append('  %s:%s;' % (k, v))
        out.append('}\n')

    # 2) قواعد العناصر
    cur_at = None
    for sels, dark, at in blocks:
        if at != cur_at:
            if cur_at:
                out.append('}')
            if at:
                out.append(at + '{')
            cur_at = at
        pre = '  ' if at else ''
        selector = ','.join('html[data-pv-theme="dark"] ' + s for s in sels)
        decls = ';'.join('%s:%s !important' % (p, v) for p, v in dark)
        out.append(pre + selector + '{' + decls + '}')
    if cur_at:
        out.append('}')

    return '\n'.join(out) + '\n' + EXTRA_CSS


EXTRA_CSS = """
/* ── retours.html: هيدر الجدول الدهبي (background:var(--gold) + نص غامق) ── */
html[data-pv-theme="dark"] thead{background:hsl(43, 44%, 19%) !important;color:#efd9a4 !important}
html[data-pv-theme="dark"] thead th,
html[data-pv-theme="dark"] thead td{color:#efd9a4 !important;border-color:#3a3220 !important}
html[data-pv-theme="dark"] tbody tr:hover{background:#1b2a44 !important}
"""

BOOT = """<script id="pv-dark-pages-boot">(function(){try{
var t=localStorage.getItem('pv_theme');
var os=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
if(t==='dark'){document.documentElement.setAttribute('data-pv-theme','dark');}
}catch(e){}})();</script>"""

SYNC = """<script id="pv-dark-pages-sync">(function(){
function apply(v){document.documentElement.setAttribute('data-pv-theme', v==='dark'?'dark':'light');}
try{apply(localStorage.getItem('pv_theme'));}catch(e){}
window.addEventListener('storage',function(e){ if(e.key==='pv_theme') apply(e.newValue); });
document.addEventListener('pv:theme',function(e){ apply(e.detail&&e.detail.theme); });
})();</script>"""


def inject(page_path, css_name):
    s = page_path.read_text(encoding='utf-8')
    block = '%s\n<link rel="stylesheet" href="%s" id="pv-dark-pages-css">\n%s\n%s' % (BEGIN, css_name, BOOT, END)
    if BEGIN in s and END in s:
        s = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda m: block, s, flags=re.S)
    else:
        # قبل </head> (آخر واحد فـ الملف ماشي داخل سكريبت)
        i = find_head_end(s)
        if i == -1:
            return False
        s = s[:i] + block + '\n' + s[i:]
    # sync قبل </body>
    sb = '<script src="pv-dark-pages-sync.js" id="pv-dark-pages-js"></script>'
    if 'pv-dark-pages-js' in s:
        s = re.sub(r'<script src="pv-dark-pages-sync\.js"[^>]*></script>', sb, s)
    else:
        j = s.rfind('</body>')
        if j == -1:
            return False
        s = s[:j] + sb + '\n' + s[j:]
    page_path.write_text(s, encoding='utf-8')
    return True


def find_head_end(s):
    """آخر </head> برا <script>."""
    out = -1
    for m in re.finditer(r'</head\s*>', s, re.I):
        before = s[:m.start()]
        if before.count('<script') <= before.count('</script>'):
            out = m.start()
    return out


def main():
    check = '--check' in sys.argv
    pages_css = []
    for name in PAGES:
        p = PUBLIC / name
        if not p.exists():
            continue
        src = p.read_text(encoding='utf-8')
        css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', src, re.S))
        if css.strip():
            pages_css.append((name, css))

    css_text = build_css(pages_css)
    css_path = PUBLIC / 'pv-dark-pages.css'
    sync_path = PUBLIC / 'pv-dark-pages-sync.js'

    if check:
        cur = css_path.read_text(encoding='utf-8') if css_path.exists() else ''
        ok = cur == css_text
        print(('✓' if ok else '✗') + ' pv-dark-pages.css ' + ('in sync' if ok else 'DRIFT'))
        return 0 if ok else 1

    css_path.write_text(css_text, encoding='utf-8')
    sync_path.write_text(SYNC.replace('<script id="pv-dark-pages-sync">', '').replace('</script>', ''), encoding='utf-8')

    for name in PAGES:
        p = PUBLIC / name
        if p.exists() and inject(p, 'pv-dark-pages.css'):
            print('  ✓ ' + name)
    print('✓ pv-dark-pages.css (%d bytes) · %d pages' % (len(css_text.encode()), len(PAGES)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
