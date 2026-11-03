#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-dark-css.py — كيولّد public_html/pv-dark.css (الوضع الليلي)

كيقرى index.html، كيجمع كل كلاسات Tailwind الملونة اللي كتستعمل، وكيولّد
ليها قواعد dark مقابلة (سطح أغمق / نص أفتح / حدود أهدأ) مع grouping
باش الملف يبقى صغير. الألوان الصلبة (أزرار 500/600، gradients) كتبقى
بحالها حيت راهي خدامة مزيان على الخلفية الغامقة.

الاستعمال:  python3 scripts/build-dark-css.py
"""
import os
import re
import collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'public_html', 'index.html')
OUT = os.path.join(ROOT, 'public_html', 'pv-dark.css')

# ── Tailwind v3 palette ─────────────────────────────────────────────────────
PALETTE = {
 'slate':  dict(_50='#f8fafc',_100='#f1f5f9',_200='#e2e8f0',_300='#cbd5e1',_400='#94a3b8',_500='#64748b',_600='#475569',_700='#334155',_800='#1e293b',_900='#0f172a'),
 'gray':   dict(_50='#f9fafb',_100='#f3f4f6',_200='#e5e7eb',_300='#d1d5db',_400='#9ca3af',_500='#6b7280',_600='#4b5563',_700='#374151',_800='#1f2937',_900='#111827'),
 'zinc':   dict(_50='#fafafa',_100='#f4f4f5',_200='#e4e4e7',_300='#d4d4d8',_400='#a1a1aa',_500='#71717a',_600='#52525b',_700='#3f3f46',_800='#27272a',_900='#18181b'),
 'stone':  dict(_50='#fafaf9',_100='#f5f5f4',_200='#e7e5e4',_300='#d6d3d1',_400='#a8a29e',_500='#78716c',_600='#57534e',_700='#44403c',_800='#292524',_900='#1c1917'),
 'red':    dict(_50='#fef2f2',_100='#fee2e2',_200='#fecaca',_300='#fca5a5',_400='#f87171',_500='#ef4444',_600='#dc2626',_700='#b91c1c',_800='#991b1b',_900='#7f1d1d'),
 'orange': dict(_50='#fff7ed',_100='#ffedd5',_200='#fed7aa',_300='#fdba74',_400='#fb923c',_500='#f97316',_600='#ea580c',_700='#c2410c',_800='#9a3412',_900='#7c2d12'),
 'amber':  dict(_50='#fffbeb',_100='#fef3c7',_200='#fde68a',_300='#fcd34d',_400='#fbbf24',_500='#f59e0b',_600='#d97706',_700='#b45309',_800='#92400e',_900='#78350f'),
 'yellow': dict(_50='#fefce8',_100='#fef9c3',_200='#fef08a',_300='#fde047',_400='#facc15',_500='#eab308',_600='#ca8a04',_700='#a16207',_800='#854d0e',_900='#713f12'),
 'lime':   dict(_50='#f7fee7',_100='#ecfccb',_200='#d9f99d',_300='#bef264',_400='#a3e635',_500='#84cc16',_600='#65a30d',_700='#4d7c0f',_800='#3f6212',_900='#365314'),
 'green':  dict(_50='#f0fdf4',_100='#dcfce7',_200='#bbf7d0',_300='#86efac',_400='#4ade80',_500='#22c55e',_600='#16a34a',_700='#15803d',_800='#166534',_900='#14532d'),
 'emerald':dict(_50='#ecfdf5',_100='#d1fae5',_200='#a7f3d0',_300='#6ee7b7',_400='#34d399',_500='#10b981',_600='#059669',_700='#047857',_800='#065f46',_900='#064e3b'),
 'teal':   dict(_50='#f0fdfa',_100='#ccfbf1',_200='#99f6e4',_300='#5eead4',_400='#2dd4bf',_500='#14b8a6',_600='#0d9488',_700='#0f766e',_800='#115e59',_900='#134e4a'),
 'cyan':   dict(_50='#ecfeff',_100='#cffafe',_200='#a5f3fc',_300='#67e8f9',_400='#22d3ee',_500='#06b6d4',_600='#0891b2',_700='#0e7490',_800='#155e75',_900='#164e63'),
 'sky':    dict(_50='#f0f9ff',_100='#e0f2fe',_200='#bae6fd',_300='#7dd3fc',_400='#38bdf8',_500='#0ea5e9',_600='#0284c7',_700='#0369a1',_800='#075985',_900='#0c4a6e'),
 'blue':   dict(_50='#eff6ff',_100='#dbeafe',_200='#bfdbfe',_300='#93c5fd',_400='#60a5fa',_500='#3b82f6',_600='#2563eb',_700='#1d4ed8',_800='#1e40af',_900='#1e3a8a'),
 'indigo': dict(_50='#eef2ff',_100='#e0e7ff',_200='#c7d2fe',_300='#a5b4fc',_400='#818cf8',_500='#6366f1',_600='#4f46e5',_700='#4338ca',_800='#3730a3',_900='#312e81'),
 'violet': dict(_50='#f5f3ff',_100='#ede9fe',_200='#ddd6fe',_300='#c4b5fd',_400='#a78bfa',_500='#8b5cf6',_600='#7c3aed',_700='#6d28d9',_800='#5b21b6',_900='#4c1d95'),
 'purple': dict(_50='#faf5ff',_100='#f3e8ff',_200='#e9d5ff',_300='#d8b4fe',_400='#c084fc',_500='#a855f7',_600='#9333ea',_700='#7e22ce',_800='#6b21a8',_900='#581c87'),
 'fuchsia':dict(_50='#fdf4ff',_100='#fae8ff',_200='#f5d0fe',_300='#f0abfc',_400='#e879f9',_500='#d946ef',_600='#c026d3',_700='#a21caf',_800='#86198f',_900='#701a75'),
 'pink':   dict(_50='#fdf2f8',_100='#fce7f3',_200='#fbcfe8',_300='#f9a8d4',_400='#f472b6',_500='#ec4899',_600='#db2777',_700='#be185d',_800='#9d174d',_900='#831843'),
 'rose':   dict(_50='#fff1f2',_100='#ffe4e6',_200='#fecdd3',_300='#fda4af',_400='#fb7185',_500='#f43f5e',_600='#e11d48',_700='#be123c',_800='#9f1239',_900='#881337'),
}
NEUTRAL = ('slate', 'gray', 'zinc', 'stone')

FAMILY_BY_HEX = {}
for _fam, _shades in PALETTE.items():
    for _sh, _hx in _shades.items():
        FAMILY_BY_HEX.setdefault(_hx.lower(), (_fam, _sh.lstrip('_')))

# ── dark tokens ─────────────────────────────────────────────────────────────
BG      = '#0a1120'   # أعمق خلفية (body)
SURF    = '#16233a'   # الكروت / bg-white  (أفتح من الصفحة باش يبان الهرم)
SURF2   = '#1b2a44'
SURF3   = '#223350'
ZEBRA   = '#121d31'   # السطر المايل (zebra)
BORDER  = '#2b3a56'
BORDER2 = '#3a4d70'
TXT     = '#e8eef7'
TXT2    = '#c6d2e2'
MUTED   = '#93a4bd'
MUTED2  = '#7b8da6'

NEUTRAL_BG = {'_50': ZEBRA, '_100': BG, '_200': '#1b2942', '_300': '#22334f'}
NEUTRAL_TXT = {'_50': '#f8fafc', '_100': '#eef2f8', '_200': '#e2e9f3', '_300': '#cfdaea',
               '_400': MUTED2, '_500': MUTED, '_600': TXT2, '_700': TXT2, '_800': TXT, '_900': TXT}
NEUTRAL_BORDER = {'_50': '#1a2436', '_100': '#1f2c44', '_200': BORDER, '_300': BORDER2,
                  '_400': '#40567c', '_500': '#4a5f83', '_600': '#55688a', '_700': '#5f7091',
                  '_800': '#6a7a99', '_900': '#75849f'}

# tints غامقة ولكن واضحة — كل عائلة عندها سطح ديالها
TINT_SOLID = {
    'green':  ('#0f2f22', '#143a2b', '#1a4634'),
    'red':    ('#38191d', '#431f24', '#4f262c'),
    'amber':  ('#35270e', '#403013', '#4c3a18'),
    'yellow': ('#332c0f', '#3d3513', '#493f18'),
    'orange': ('#3a2410', '#462c14', '#523318'),
    'blue':   ('#14263f', '#182f4d', '#1e3a5e'),
    'cyan':   ('#0e2c33', '#123640', '#17424d'),
    'violet': ('#231d3f', '#2b244c', '#332a59'),
    'pink':   ('#351a2b', '#412034', '#4d263e'),
}
GROUP_OF = {
    'green': 'green', 'emerald': 'green', 'lime': 'green', 'teal': 'green',
    'red': 'red', 'rose': 'red',
    'amber': 'amber', 'orange': 'orange', 'yellow': 'yellow',
    'blue': 'blue', 'sky': 'blue', 'indigo': 'violet',
    'violet': 'violet', 'purple': 'violet', 'fuchsia': 'violet',
    'cyan': 'cyan', 'pink': 'pink',
}
# شريط الحالة (accent) على حافة السطر
ACCENT = {
    'green': '#4ade80', 'red': '#f87171', 'amber': '#fbbf24', 'yellow': '#facc15',
    'orange': '#fb923c', 'blue': '#60a5fa', 'cyan': '#22d3ee',
    'violet': '#a78bfa', 'pink': '#f472b6',
}


def tint(hue, shade):
    g = GROUP_OF.get(hue, 'blue')
    idx = {'50': 0, '100': 0, '200': 1, '300': 2}.get(shade, 0)
    return TINT_SOLID[g][idx]


def accent(hue):
    return ACCENT.get(GROUP_OF.get(hue, 'blue'), '#60a5fa')
TXT_LIFT = {'_50': '_50', '_100': '_100', '_200': '_200', '_300': '_300',
            '_400': '_300', '_500': '_400', '_600': '_400', '_700': '_300',
            '_800': '_300', '_900': '_200'}


def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgba(hex_color, a):
    r, g, b = hex2rgb(hex_color)
    return f'rgba({r}, {g}, {b}, {a})'


def dark_value(prop, hue, shade, alpha):
    """رجّع اللون الغامق المناسب، ولا None إلا كان خاصو يبقى بحالو."""
    key = '_' + shade
    if hue in ('transparent', 'current'):
        return None
    if prop in ('from', 'via', 'to'):
        # تدرّجات فاتحة (from-blue-50, to-white...) خاصها تولي غامقة
        if hue in ('white', 'black'):
            return SURF if hue == 'white' else None
        if hue in NEUTRAL:
            return NEUTRAL_BG.get(key) if shade in ('50', '100', '200', '300') else None
        if shade in ('50', '100', '200', '300'):
            return tint(hue, shade)
        return None
    if hue in ('white', 'black', 'transparent', 'current'):
        if prop == 'bg' and hue == 'white':
            if alpha is None:
                return SURF
            # bg-white/90 فوق خلفية غامقة = طبقة بيضاء → كنغامقوها.
            # bg-white/10..40 (شارات فوق هيدر ملوّن) كتبقى بحالها.
            return rgba(SURF, alpha) if alpha >= 0.45 else None
        if prop in ('text', 'fill', 'stroke') and hue == 'white':
            return None
        return None
    if hue in NEUTRAL:
        if prop == 'bg':
            if shade in ('50', '100', '200', '300'):
                c = NEUTRAL_BG[key]
                return c if alpha is None else rgba(c, alpha)
            return None                                      # 400+ صلبة
        if prop == 'text':
            c = NEUTRAL_TXT.get(key)
            return c if alpha is None else (c and rgba(c, alpha))
        if prop in ('border', 'ring', 'divide', 'outline'):
            c = NEUTRAL_BORDER.get(key)
            return c if alpha is None else (c and rgba(c, alpha))
        return None
    # hues ملوّنة
    if prop == 'bg':
        if shade in ('50', '100', '200', '300'):
            return tint(hue, shade)                          # سطح غامق ملوّن واضح
        return None                                          # ألوان صلبة كتبقى
    if prop == 'text':
        if shade in ('500', '600', '700', '800', '900'):
            return PALETTE[hue][TXT_LIFT[key]]
        return None
    if prop in ('border', 'ring', 'divide', 'outline'):
        if shade in ('50', '100', '200'):
            return rgba(PALETTE[hue]['_500'], .45)
        if shade == '300':
            return rgba(PALETTE[hue]['_500'], .60)
        return None
    return None


MEDIA = {'sm': 640, 'md': 768, 'lg': 1024, 'xl': 1280, '2xl': 1536}
PSEUDO = {'hover': ':hover', 'focus': ':focus', 'active': ':active',
          'focus-visible': ':focus-visible', 'disabled': ':disabled',
          'group-hover': ':hover'}

UTIL_RE = re.compile(
    r'(?<![\w-])((?:[a-z0-9-]+:)*)?'
    r'(bg|text|border|ring|divide|outline|fill|stroke|placeholder|from|via|to)'
    r'-(white|black|transparent|current|' + '|'.join(PALETTE) + r')(?:-(\d{2,3}))?(?:/(\d{1,3}))?'
    r'(?![\w-])')


def _rgb(hexv):
    h = hexv.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hsl(hexv):
    r, g, b = [v / 255 for v in _rgb(hexv)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s_ = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s_, l


def recolor(hexv, light, smin=0.35, smax=0.60):
    """كيحافظ على الصبغة (hue) وكيبدل الإضاءة + كيحدّ التشبع."""
    h, s_, _ = _hsl(hexv)
    s_ = max(smin, min(smax, s_))
    return 'hsl(%.0f, %.0f%%, %.0f%%)' % (h, s_ * 100, light * 100)


def _lum(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    if len(h) == 8:
        h = h[:6]
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def _rgb_str(hex_color, alpha=None):
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    if alpha is not None and alpha < 1:
        return f'rgba({r}, {g}, {b}, {alpha:g})'
    return f'rgb({r}, {g}, {b})'


def build_inline_rules(src):
    """ألوان الـ inline style → قواعد dark.

    عندنا جوج عائلات:
      • ألوان السطور (status): مكتوبة فـ ternaries  ?"#34c759": ... وكتطبق على
        tr/td. هذوك خاصهم يغامقو **ديما** (واخا يكونو مشبعين)، مع شريط حالة.
      • ألوان الأسطح الفاتحة (كروت/خلايا): كتبقى فاتحة فـ light → كتولي سطح غامق.
      • ألوان النصوص الغامقة → كتولي فاتحة باش تتقرا.
    """
    # (أ) الخصائص اللي كتعني background
    bg_pairs = [(m.group(1), m.group(2)) for m in re.finditer(
        r"(background|backgroundColor|bg)\s*:\s*[\'\"](#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))[\'\"]", src)]
    # (ب) سلاسل الألوان ديال الحالة:  ?"#xxxxxx"
    ternary = re.findall(r'\?"(#[0-9a-fA-F]{3,6})"', src)
    # (ج) ألوان النص/الحدود
    fg_pairs = [(m.group(1), m.group(2)) for m in re.finditer(
        r"(color|borderColor|borderLeftColor|fill|stroke)\s*:\s*[\'\"](#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))[\'\"]", src)]

    def norm(val):
        v = val.strip()
        if v.startswith('#'):
            alpha = 1.0
            if len(v.lstrip('#')) == 8:
                alpha = int(v[-2:], 16) / 255
            return v.lower()[:7], alpha
        nums = [float(x) for x in re.findall(r'[\d.]+', v)]
        if len(nums) < 3:
            return None
        return '#%02x%02x%02x' % tuple(int(min(255, n)) for n in nums[:3]), (nums[3] if len(nums) > 3 else 1.0)

    light_rules = {}   # ألوان فاتحة (سطح) → أي عنصر
    row_rules = {}     # ألوان السطور → tr/td
    stripes = set()
    fg_rules = {}

    def add(bucket, target, sel):
        bucket.setdefault(target, set()).add(sel)

    def handle_bg(hexv, alpha, rgbv, as_row):
        lum = _lum(hexv)
        fam = FAMILY_BY_HEX.get(hexv)
        if as_row and lum >= 0.26:
            target = tint(fam[0], fam[1]) if (fam and fam[0] not in NEUTRAL and fam[1] in ('50', '100', '200', '300')) else recolor(hexv, 0.17)
            for prop in ('background', 'background-color'):
                for tag in ('tr', 'td'):
                    add(row_rules, target, '%s[style*="%s: %s"]' % (tag, prop, rgbv))
            stripes.add((rgbv, recolor(hexv, 0.62, 0.45, 0.80)))
            return
        if lum >= 0.45:
            # ألوان العلامة (Tailwind 400+) كتبقى بحالها فـ الأزرار والبادجات
            if fam and fam[1] not in ('50', '100', '200', '300'):
                return
            if fam and fam[0] in NEUTRAL:
                target = NEUTRAL_BG['_' + fam[1]]
            elif fam:
                target = tint(fam[0], fam[1])
            elif lum >= 0.93:
                target = SURF
            elif lum >= 0.80:
                target = SURF2
            else:
                target = recolor(hexv, 0.17)
            for prop in ('background', 'background-color'):
                add(light_rules, target, '[style*="%s: %s"]' % (prop, rgbv))
            return

    seen_bg = set()
    for prop, val in bg_pairs:
        n = norm(val)
        if not n:
            continue
        hexv, alpha = n
        rgbv = _rgb_str(hexv, alpha)
        if rgbv in seen_bg:
            continue
        seen_bg.add(rgbv)
        handle_bg(hexv, alpha, rgbv, False)

    seen_row = set()
    for hexv in ternary:
        hexv = hexv.lower()
        if hexv in seen_row:
            continue
        seen_row.add(hexv)
        rgbv = _rgb_str(hexv, 1.0)
        if rgbv in seen_bg:
            continue
        handle_bg(hexv, 1.0, rgbv, True)

    for prop, val in fg_pairs:
        n = norm(val)
        if not n:
            continue
        hexv, alpha = n
        rgbv = _rgb_str(hexv, alpha)
        lum = _lum(hexv)
        fam = FAMILY_BY_HEX.get(hexv)
        if prop in ('color',):
            if lum >= 0.82:
                continue
            if fam and fam[0] not in NEUTRAL and fam[1] in ('400', '500', '600', '700', '800', '900'):
                target = PALETTE[fam[0]][TXT_LIFT['_' + fam[1]]]
            elif fam and fam[0] in NEUTRAL:
                target = NEUTRAL_TXT.get('_' + fam[1])
            elif lum <= 0.10:
                target = TXT
            elif lum <= 0.22:
                target = TXT2
            elif lum <= 0.36:
                target = MUTED
            else:
                target = recolor(hexv, 0.72, 0.40, 0.80)
            add(fg_rules, target, '[style*="color: %s"]' % rgbv)
        else:
            if lum < 0.72:
                continue
            if fam and fam[0] in NEUTRAL:
                target = NEUTRAL_BORDER.get('_' + fam[1], BORDER)
            elif fam:
                target = rgba(PALETTE[fam[0]]['_500'], .42)
            else:
                target = BORDER
            add(fg_rules, target, '[style*="-color: %s"]' % rgbv)

    out = ['\n/* ── ألوان inline (جداول/كروت كتبني بـ style مباشرة) ── */']
    for target, sels in sorted(row_rules.items()):
        out.append('html[data-pv-theme="dark"] :is(%s){background-color:%s !important}'
                   % (','.join(sorted(sels)), target))
    for target, sels in sorted(light_rules.items()):
        out.append('html[data-pv-theme="dark"] :is(%s){background-color:%s !important}'
                   % (','.join(sorted(sels)), target))
    for target, sels in sorted(fg_rules.items()):
        border = [x for x in sorted(sels) if '-color:' in x]
        plain = [x for x in sorted(sels) if '-color:' not in x]
        if plain:
            out.append('html[data-pv-theme="dark"] :is(%s){color:%s !important}'
                       % (','.join(plain), target))
        if border:
            out.append('html[data-pv-theme="dark"] :is(%s){border-color:%s !important}'
                       % (','.join(border), target))

    if stripes:
        out.append('\n/* ── شريط الحالة على حافة السطر (RTL: اليمين) ── */')
        for rgbv, acc in sorted(stripes):
            for prop in ('background', 'background-color'):
                out.append(
                    'html[data-pv-theme="dark"] tr[style*="%s: %s"]>td:first-child'
                    '{box-shadow:inset 3px 0 0 %s !important}'
                    % (prop, rgbv, acc))
    return '\n'.join(out) + '\n'


def build_arbitrary_rules(src):
    """كلاسات Tailwind بـ قيمة حرة (bg-[#f1c232] ...) — ألوان الهيدر ديال الجدول."""
    out = ['\n/* ── كلاسات بقيمة حرة bg-[#...] / text-[#...] ── */']
    seen = set()
    for m in re.finditer(r'\.(bg|text|border)-\\\[\\#([0-9a-fA-F]{3,6})\\\]', src):
        prop, raw = m.group(1), m.group(2)
        key = (prop, raw.lower())
        if key in seen:
            continue
        seen.add(key)
        hexv = '#' + raw
        lum = _lum(hexv)
        cls = '.%s-\\[\\#%s\\]' % (prop, raw)
        if prop == 'bg':
            if lum <= 0.12:
                continue
            val = recolor(hexv, 0.30, 0.40, 0.62)
            out.append('html[data-pv-theme="dark"] %s{background-color:%s !important}' % (cls, val))
        elif prop == 'text':
            if lum >= 0.45:
                continue
            val = recolor(hexv, 0.74, 0.40, 0.80)
            out.append('html[data-pv-theme="dark"] %s{color:%s !important}' % (cls, val))
        else:
            if lum < 0.6:
                continue
            out.append('html[data-pv-theme="dark"] %s{border-color:rgba(148,163,184,.45) !important}' % cls)
    return '\n'.join(out) + '\n' if len(out) > 1 else ''


def build_kpi_rules(src):
    """كروت KPI كتستعمل CSS vars inline (--pvk-bg/--pvk-bd) → كنغامقوهم."""
    pairs = re.findall(r'"--pvk-bg":"(#[0-9a-fA-F]{6})","--pvk-bd":"(#[0-9a-fA-F]{6})"', src)
    out = ['\n/* ── كروت KPI (متغيرات --pvk inline) ── */']
    seen = set()
    for bg_light, bd_light in pairs:
        if bg_light in seen:
            continue
        seen.add(bg_light)
        fam = FAMILY_BY_HEX.get(bg_light.lower())
        if not fam:
            continue
        family, shade = fam
        if family in NEUTRAL:
            new_bg, new_bd = SURF2, BORDER
        else:
            new_bg = tint(family, '100')
            acc = accent(family)
            new_bd = rgba(acc, .38)
        out.append(
            'html[data-pv-theme="dark"] [style*="--pvk-bg: %s"]'
            '{--pvk-bg:%s !important;--pvk-bd:%s !important}' % (bg_light, new_bg, new_bd))
    return '\n'.join(out) + '\n' if len(out) > 1 else ''


def esc(cls):
    out = []
    for ch in cls:
        if ch.isalnum() or ch in '-_':
            out.append(ch)
        else:
            out.append('\\' + ch)
    return ''.join(out)


def main():
    src = open(INDEX, encoding='utf-8').read()
    rules = collections.Counter()
    covered = set()
    kept = set()

    for m in UTIL_RE.finditer(src):
        prefix, prop, hue, shade, alpha = m.group(1) or '', m.group(2), m.group(3), m.group(4), m.group(5)
        if not shade:
            shade = '50' if hue in ('white', 'black', 'transparent', 'current') else '500'
        a = int(alpha) / 100 if alpha else None
        real_prop = 'bg' if prop == 'placeholder' else prop
        val = dark_value(real_prop, hue, shade, a)
        cls = m.group(0)
        if val is None:
            kept.add(cls)
            continue
        # selector
        mods = [p for p in prefix.split(':') if p]
        media = [x for x in mods if x in MEDIA]
        pseudo = [PSEUDO[x] for x in mods if x in PSEUDO]
        base = cls
        for mm in media + [x for x in mods if x in PSEUDO]:
            base = base.replace(mm + ':', '', 1)
        selector = '.' + esc(base) + (''.join(pseudo) or '')
        css_prop = {'bg': 'background-color', 'text': 'color', 'border': 'border-color',
                    'ring': '--tw-ring-color', 'divide': 'border-color',
                    'outline': 'outline-color', 'fill': 'fill', 'stroke': 'stroke',
                    'placeholder': 'color', 'from': '--tw-gradient-from',
                    'via': '--tw-gradient-via', 'to': '--tw-gradient-to'}[prop]
        # placeholder:/file: خاصهم ::placeholder
        if 'placeholder' in mods:
            selector += '::placeholder'
        mq = f'@media (min-width:{MEDIA[media[0]]}px)' if media else ''
        rules[(mq, css_prop, val)] += 0
        rules[(mq, css_prop, val)] = rules.get((mq, css_prop, val), 0)
        covered.add(cls)
        _BUCKET.setdefault((mq, css_prop, val), set()).add(selector)

    gen = []
    by_mq = collections.defaultdict(list)
    for (mq, css_prop, val), sels in _BUCKET.items():
        sels = sorted(sels)
        sel = 'html[data-pv-theme="dark"] ' + (sels[0] if len(sels) == 1 else ':is(' + ','.join(sels) + ')')
        by_mq[mq].append(f'{sel}{{{css_prop}:{val} !important}}')
    for mq in sorted(by_mq):
        block = '\n'.join(by_mq[mq])
        gen.append(f'{mq}{{\n{block}\n}}' if mq else block)

    inline_css = build_inline_rules(src) + build_kpi_rules(src) + build_arbitrary_rules(src)
    core = (CORE_TEMPLATE
            .replace('__BG__', BG).replace('__SURF2__', SURF2).replace('__SURF3__', SURF3)
            .replace('__SURF__', SURF).replace('__ZEBRA__', ZEBRA)
            .replace('__BORDER2__', BORDER2).replace('__BORDER__', BORDER)
            .replace('__INPUT__', '#101c31'))
    header = f"""/* ═══════════════════════════════════════════════════════════════════
   Paraveda CRM — Dark Mode (مود ليلي)
   مولّد أوتوماتيكياً بـ scripts/build-dark-css.py — ما تعدلوش بيدك.
   {len(covered)} utility مغطاة · {len(kept)} لون صلبة بقاو بحالهم.
   ═══════════════════════════════════════════════════════════════════ */
"""
    open(OUT, 'w', encoding='utf-8').write(header + core + inline_css + '\n\n/* ── utilities مولوّدة ── */\n' + '\n'.join(gen) + '\n')
    print(f'✓ {OUT}  ({os.path.getsize(OUT)} bytes)')
    print(f'  utilities covered: {len(covered)}   kept-as-is: {len(kept)}')
    open('/tmp/dark-covered.json', 'w').write(str(sorted(covered)))
    open('/tmp/dark-kept.json', 'w').write(str(sorted(kept)))


_BUCKET = {}


CORE_TEMPLATE = r"""
/* ── tokens ────────────────────────────────────────────────────────────── */
html[data-pv-theme="dark"]{
  color-scheme: dark;
  --pv-bg:__BG__; --pv-surface:__SURF__; --pv-surface-2:__SURF2__; --pv-surface-3:__SURF3__;
  --pv-border:__BORDER__; --pv-border-strong:__BORDER2__;
  --pv-text:#e8eef7; --pv-text-2:#c6d2e2; --pv-muted:#93a4bd;
  --pv-shadow:0 10px 30px rgba(0,0,0,.55);
  background:__BG__;
}
html[data-pv-theme="dark"] body{background:__BG__;color:var(--pv-text)}

/* الجدول كيتعاود يـrender frequently → transition كيبدا من جديد وما كيوصلش
   للون الغامق. كنطفيوه فـ الجداول (ماشي ضروري أصلاً). */
html[data-pv-theme="dark"] table,
html[data-pv-theme="dark"] thead,
html[data-pv-theme="dark"] tbody,
html[data-pv-theme="dark"] tr,
html[data-pv-theme="dark"] td,
html[data-pv-theme="dark"] th{transition:none !important}

/* كروت KPI */
/* داخل الجدول: الخلايا عندها input كيغطيها → كنخليوه شفاف باش لون
   الحالة (Livrée/Retour/Expédié...) يبان بحال فـ light mode. */
html[data-pv-theme="dark"] td input,
html[data-pv-theme="dark"] td select,
html[data-pv-theme="dark"] td textarea{background-color:transparent !important;box-shadow:none !important}
html[data-pv-theme="dark"] td input:focus,
html[data-pv-theme="dark"] td select:focus,
html[data-pv-theme="dark"] td textarea:focus{background-color:rgba(255,255,255,.06) !important}

html[data-pv-theme="dark"] .pvk-val{color:var(--pv-text) !important}
html[data-pv-theme="dark"] .pvk-lab{color:var(--pvk) !important;filter:brightness(1.55) saturate(1.15)}
html[data-pv-theme="dark"] .pvk-ico{box-shadow:0 6px 16px -6px var(--pvk-rg),0 0 0 1px rgba(255,255,255,.06)}

html[data-pv-theme="dark"] ::placeholder{color:#8497b3 !important;opacity:1}

/* أيقونة التقويم فـ input[type=date] كتكون غامقة على خلفية غامقة */
html[data-pv-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator,
html[data-pv-theme="dark"] input[type="time"]::-webkit-calendar-picker-indicator,
html[data-pv-theme="dark"] input[type="datetime-local"]::-webkit-calendar-picker-indicator{
  filter:invert(0.85) brightness(1.6);opacity:.75;cursor:pointer}
html[data-pv-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1}
html[data-pv-theme="dark"] .pvk-desc,
html[data-pv-theme="dark"] .pvk-scope,
html[data-pv-theme="dark"] .pvk-arw{color:var(--pv-muted) !important}
html[data-pv-theme="dark"] .pvk-bar{background:var(--pv-surface) !important;border-bottom-color:var(--pv-border) !important}
html[data-pv-theme="dark"] .pvk-chip{background:rgba(99,102,241,.16) !important;color:#c7d2fe !important}
html[data-pv-theme="dark"] .pvk-badge.up{background:rgba(16,185,129,.18) !important;color:#6ee7b7 !important}
html[data-pv-theme="dark"] .pvk-badge.dn{background:rgba(239,68,68,.18) !important;color:#fca5a5 !important}

/* منع الوميض الأبيض ملي كتبدل الوضع */
html.pv-theme-anim,html.pv-theme-anim body,html.pv-theme-anim #root,
html.pv-theme-anim header,html.pv-theme-anim table,html.pv-theme-anim td,
html.pv-theme-anim input,html.pv-theme-anim select{
  transition:background-color .28s ease,color .28s ease,border-color .28s ease !important;
}

/* ── الجداول (COMONDES / LIVRAISON...) : ألوان inline ─────────────────── */
html[data-pv-theme="dark"] [style*="background: rgb(248, 249, 250)"],
html[data-pv-theme="dark"] [style*="background-color: rgb(248, 249, 250)"]{background-color:__ZEBRA__ !important}
html[data-pv-theme="dark"] [style*="background: rgb(15, 23, 42)"],
html[data-pv-theme="dark"] [style*="background-color: rgb(15, 23, 42)"]{background-color:__BG__ !important}

/* ── عناصر الفورم ─────────────────────────────────────────────────────── */
html[data-pv-theme="dark"] input,
html[data-pv-theme="dark"] select,
html[data-pv-theme="dark"] textarea{
  background-color:__INPUT__ !important;color:var(--pv-text) !important;
  border-color:var(--pv-border) !important;caret-color:#818cf8;
}
html[data-pv-theme="dark"] input::placeholder,
html[data-pv-theme="dark"] textarea::placeholder{color:#6b7c96 !important}
html[data-pv-theme="dark"] select option{background:__INPUT__;color:var(--pv-text)}
html[data-pv-theme="dark"] input[type="checkbox"],
html[data-pv-theme="dark"] input[type="radio"]{accent-color:#6366f1}
html[data-pv-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.8)}
html[data-pv-theme="dark"] table{background-color:transparent}
html[data-pv-theme="dark"] th{background-color:__SURF__ !important;color:var(--pv-text-2) !important}
html[data-pv-theme="dark"] img,html[data-pv-theme="dark"] video{filter:brightness(.92)}

/* ── scrollbar ─────────────────────────────────────────────────────────── */
html[data-pv-theme="dark"] ::-webkit-scrollbar{width:11px;height:11px}
html[data-pv-theme="dark"] ::-webkit-scrollbar-track{background:__BG__}
html[data-pv-theme="dark"] ::-webkit-scrollbar-thumb{background:#2f4062;border-radius:8px;border:2px solid __BG__}
html[data-pv-theme="dark"] ::-webkit-scrollbar-thumb:hover{background:#37496b}
html[data-pv-theme="dark"] ::selection{background:rgba(99,102,241,.4);color:#fff}

/* ── الأزرار اللي فيها shadows قوية ────────────────────────────────────── */
html[data-pv-theme="dark"] .shadow-md,
html[data-pv-theme="dark"] .shadow-lg,
html[data-pv-theme="dark"] .shadow-xl{box-shadow:var(--pv-shadow) !important}

/* ══════════════════════════════════════════════════════════════════
   زر الوضع الليلي — كيبان حدى زر الخروج فالهيدر
   ══════════════════════════════════════════════════════════════════ */
.pv-theme-btn{
  position:relative;display:grid;place-items:center;flex:0 0 auto;
  width:36px;height:36px;padding:0;margin:0;border-radius:12px;
  border:2px solid #e2e8f0;background:#fff;color:#475569;
  cursor:pointer;line-height:0;overflow:hidden;
  box-shadow:0 1px 2px rgba(15,23,42,.06);
  transition:transform .16s ease,background-color .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease;
  -webkit-tap-highlight-color:transparent;
}
.pv-theme-btn:hover{border-color:#c7d2fe;background:#eef2ff;color:#4f46e5;box-shadow:0 4px 12px rgba(79,70,229,.18)}
.pv-theme-btn:active{transform:scale(.94)}
.pv-theme-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
.pv-theme-btn .pv-ic{position:absolute;inset:0;display:grid;place-items:center;
  transition:opacity .22s ease,transform .38s cubic-bezier(.34,1.4,.64,1)}
.pv-theme-btn .pv-ic svg{width:17px;height:17px;display:block}
.pv-theme-btn .pv-ic-sun{opacity:0;transform:rotate(-70deg) scale(.4)}
.pv-theme-btn .pv-ic-moon{opacity:1;transform:rotate(0) scale(1)}
html[data-pv-theme="dark"] .pv-theme-btn{
  border-color:#33456a;background:#16223a;color:#a5b4fc;box-shadow:none;
}
html[data-pv-theme="dark"] .pv-theme-btn:hover{border-color:#4f46e5;background:#1c2a45;color:#c7d2fe}
html[data-pv-theme="dark"] .pv-theme-btn .pv-ic-sun{opacity:1;transform:rotate(0) scale(1)}
html[data-pv-theme="dark"] .pv-theme-btn .pv-ic-moon{opacity:0;transform:rotate(70deg) scale(.4)}
/* موبايل: زر أصغر شوية باش الهيدر ما يتزاحمش */
@media (max-width:600px){
  .pv-theme-btn{width:32px;height:32px;border-radius:10px}
  .pv-theme-btn .pv-ic svg{width:15px;height:15px}
}
/* fallback: صفحات بلا هيدر (login) */
.pv-theme-btn-fixed{position:fixed;top:14px;right:14px;z-index:99998}

@media (prefers-reduced-motion:reduce){
  .pv-theme-btn,.pv-theme-btn .pv-ic{transition:none !important}
  html.pv-theme-anim *{transition:none !important}
}
"""

if __name__ == '__main__':
    main()
