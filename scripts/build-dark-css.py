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
BG      = '#070d18'   # أعمق خلفية (body)
SURF    = '#101a2c'   # الكروت / bg-white
SURF2   = '#16223a'
SURF3   = '#1c2a45'
BORDER  = '#26354f'
BORDER2 = '#33456a'
TXT     = '#e8eef7'
TXT2    = '#c6d2e2'
MUTED   = '#93a4bd'
MUTED2  = '#7b8da6'

NEUTRAL_BG = {'_50': '#0b1424', '_100': '#0e1830', '_200': '#14203a', '_300': '#1b2946'}
NEUTRAL_TXT = {'_50': '#f8fafc', '_100': '#eef2f8', '_200': '#e2e9f3', '_300': '#cfdaea',
               '_400': MUTED2, '_500': MUTED, '_600': TXT2, '_700': TXT2, '_800': TXT, '_900': TXT}
NEUTRAL_BORDER = {'_50': '#1a2436', '_100': '#1f2c44', '_200': BORDER, '_300': BORDER2,
                  '_400': '#40567c', '_500': '#4a5f83', '_600': '#55688a', '_700': '#5f7091',
                  '_800': '#6a7a99', '_900': '#75849f'}

TINT = {'_50': .12, '_100': .18, '_200': .26, '_300': .34}
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
            return rgba(PALETTE[hue]['_500'], {'_50': .10, '_100': .16, '_200': .24, '_300': .32}[key])
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
            return rgba(PALETTE[hue]['_500'], TINT[key])
        return None                                          # ألوان صلبة كتبقى
    if prop == 'text':
        if shade in ('500', '600', '700', '800', '900'):
            return PALETTE[hue][TXT_LIFT[key]]
        return None
    if prop in ('border', 'ring', 'divide', 'outline'):
        if shade in ('50', '100', '200'):
            return rgba(PALETTE[hue]['_500'], .32)
        if shade == '300':
            return rgba(PALETTE[hue]['_500'], .45)
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
    """ألوان الـ inline style (React style objects) → attribute selectors.

    كنحافظو على معنى اللون: chip خضراء كتبقى خضراء (بدرجة غامقة)،
    والنص الأحمر كيبقى أحمر ولكن أفتح باش يتقرا على الخلفية الغامقة.
    """
    pairs = re.findall(
        r"(background|backgroundColor|color|borderColor|borderLeftColor|fill|stroke)"
        r"\s*:\s*[\'\"](#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))[\'\"]", src)

    seen = {}
    for prop, val in pairs:
        v = val.strip()
        if v.startswith('#'):
            alpha = 1.0
            if len(v.lstrip('#')) == 8:
                alpha = int(v[-2:], 16) / 255
            hexv = v.lower()[:7]
        else:
            nums = [float(x) for x in re.findall(r'[\d.]+', v)]
            if len(nums) < 3:
                continue
            hexv = '#%02x%02x%02x' % tuple(int(min(255, n)) for n in nums[:3])
            alpha = nums[3] if len(nums) > 3 else 1.0
        css_prop = {'background': 'background', 'backgroundColor': 'background-color',
                    'color': 'color', 'borderColor': 'border-color',
                    'borderLeftColor': 'border-left-color',
                    'fill': 'fill', 'stroke': 'stroke'}[prop]
        seen[(css_prop, _rgb_str(hexv, alpha))] = (hexv, alpha)

    def classify(hexv, alpha):
        """(family, shade) إلا كان اللون من palette، ولا None."""
        fam = FAMILY_BY_HEX.get(hexv)
        return fam

    bg_rules, fg_rules = {}, {}

    def add(bucket, target, sel):
        bucket.setdefault(target, set()).add(sel)

    for (css_prop, rgbv), (hexv, alpha) in seen.items():
        lum = _lum(hexv)
        fam = classify(hexv, alpha)

        if css_prop in ('background', 'background-color'):
            target = None
            if fam:
                family, shade = fam
                if family in NEUTRAL and shade in ('50', '100', '200', '300'):
                    target = NEUTRAL_BG['_' + shade]
                elif family not in NEUTRAL and shade in ('50', '100', '200', '300'):
                    target = rgba(PALETTE[family]['_500'], TINT['_' + shade])
            if target is None:
                if lum >= 0.90:
                    target = SURF
                elif lum >= 0.78:
                    target = SURF2
                elif lum >= 0.60:
                    target = SURF3
            if target is None:
                continue
            for prop in ('background', 'background-color'):
                add(bg_rules, target, f'[style*="{prop}: {rgbv}"]')

        elif css_prop == 'color':
            if lum >= 0.82:                     # نص أبيض/فاتح: خليه
                continue
            target = None
            if fam and fam[0] not in NEUTRAL and fam[1] in ('400', '500', '600', '700', '800', '900'):
                target = PALETTE[fam[0]][TXT_LIFT['_' + fam[1]]]
            if target is None and fam and fam[0] in NEUTRAL:
                target = NEUTRAL_TXT.get('_' + fam[1])
            if target is None:
                if lum <= 0.10:
                    target = TXT
                elif lum <= 0.22:
                    target = TXT2
                elif lum <= 0.36:
                    target = MUTED
                else:
                    continue
            add(fg_rules, target, f'[style*="color: {rgbv}"]')

        else:                                   # border-color / fill / stroke
            if lum < 0.72:
                continue
            target = None
            if fam:
                family, shade = fam
                if family in NEUTRAL:
                    target = NEUTRAL_BORDER.get('_' + shade)
                else:
                    target = rgba(PALETTE[family]['_500'], .32)
            if target is None:
                target = BORDER
            add(fg_rules, target, f'[style*="-color: {rgbv}"]')

    out = ['\n/* ── ألوان inline (جداول/كروت كتبني بـ style مباشرة) ── */']
    for target, sels in sorted(bg_rules.items()):
        out.append('html[data-pv-theme="dark"] :is(%s){background-color:%s !important}'
                   % (','.join(sorted(sels)), target))
    for target, sels in sorted(fg_rules.items()):
        border = [x for x in sorted(sels) if '-color:' in x]
        plain = [x for x in sorted(sels) if '-color:' not in x]
        if plain:
            prop = 'fill' if any('fill' in x for x in plain) else 'color'
            out.append('html[data-pv-theme="dark"] :is(%s){%s:%s !important}'
                       % (','.join(plain), prop, target))
        if border:
            out.append('html[data-pv-theme="dark"] :is(%s){border-color:%s !important}'
                       % (','.join(border), target))
    return '\n'.join(out) + '\n'


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

    inline_css = build_inline_rules(src)
    core = CORE_TEMPLATE
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
  --pv-bg:#070d18; --pv-surface:#101a2c; --pv-surface-2:#16223a; --pv-surface-3:#1c2a45;
  --pv-border:#26354f; --pv-border-strong:#33456a;
  --pv-text:#e8eef7; --pv-text-2:#c6d2e2; --pv-muted:#93a4bd;
  --pv-shadow:0 10px 30px rgba(0,0,0,.55);
  background:#070d18;
}
html[data-pv-theme="dark"] body{background:#070d18;color:var(--pv-text)}

/* منع الوميض الأبيض ملي كتبدل الوضع */
html.pv-theme-anim,html.pv-theme-anim body,html.pv-theme-anim #root,
html.pv-theme-anim header,html.pv-theme-anim table,html.pv-theme-anim td,
html.pv-theme-anim input,html.pv-theme-anim select{
  transition:background-color .28s ease,color .28s ease,border-color .28s ease !important;
}

/* ── الجداول (COMONDES / LIVRAISON...) : ألوان inline ─────────────────── */
html[data-pv-theme="dark"] [style*="background: rgb(248, 249, 250)"],
html[data-pv-theme="dark"] [style*="background-color: rgb(248, 249, 250)"]{background-color:#0c1526 !important}
html[data-pv-theme="dark"] [style*="background: rgb(15, 23, 42)"],
html[data-pv-theme="dark"] [style*="background-color: rgb(15, 23, 42)"]{background-color:#0b1424 !important}

/* ── عناصر الفورم ─────────────────────────────────────────────────────── */
html[data-pv-theme="dark"] input,
html[data-pv-theme="dark"] select,
html[data-pv-theme="dark"] textarea{
  background-color:#0c1526 !important;color:var(--pv-text) !important;
  border-color:var(--pv-border) !important;caret-color:#818cf8;
}
html[data-pv-theme="dark"] input::placeholder,
html[data-pv-theme="dark"] textarea::placeholder{color:#6b7c96 !important}
html[data-pv-theme="dark"] select option{background:#0c1526;color:var(--pv-text)}
html[data-pv-theme="dark"] input[type="checkbox"],
html[data-pv-theme="dark"] input[type="radio"]{accent-color:#6366f1}
html[data-pv-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.8)}
html[data-pv-theme="dark"] table{background-color:transparent}
html[data-pv-theme="dark"] th{background-color:#101a2c !important;color:var(--pv-text-2) !important}
html[data-pv-theme="dark"] img,html[data-pv-theme="dark"] video{filter:brightness(.92)}

/* ── scrollbar ─────────────────────────────────────────────────────────── */
html[data-pv-theme="dark"] ::-webkit-scrollbar{width:11px;height:11px}
html[data-pv-theme="dark"] ::-webkit-scrollbar-track{background:#0a1220}
html[data-pv-theme="dark"] ::-webkit-scrollbar-thumb{background:#2a3a58;border-radius:8px;border:2px solid #0a1220}
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
