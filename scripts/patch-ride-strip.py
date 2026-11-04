#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-ride-strip.py — كيبدل «شريط الشارع» (pv-street / pv-rider / pv-client)
فـ شريط أدوات الطلبيات بـ «Control Tower» احترافي **بأرقام حقيقية**:
SVG + CSS خالص (بلا صور) + الأرقام كتتحسب من نفس الطلبيات المعروضة (q).

    python3 scripts/patch-ride-strip.py
    python3 scripts/patch-ride-strip.py --check   # واش مطبّق

idempotent: علامات /*PV-RIDE:BEGIN*/ … /*PV-RIDE:END*/ و PV-RIDE-HELPER.
"""
import sys, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN = "/*PV-RIDE:BEGIN*/"
CSS_END = "/*PV-RIDE:END*/"
HELP_BEGIN = "<!--PV-RIDE-HELPER:BEGIN-->"
HELP_END = "<!--PV-RIDE-HELPER:END-->"

# ─────────────────────────────────────────────────────────────────────────
# 1) الستايل
# ─────────────────────────────────────────────────────────────────────────
NEW_CSS = CSS_BEGIN + r"""
/* ===== شريط المسار — NEON GAUGES (حلقات + حزم كتدوز) ===== */
.pv-ride{position:relative;flex:1 1 440px;min-width:340px;height:62px;overflow:hidden;
 align-self:center;pointer-events:none;border-radius:14px;isolation:isolate;
 background:
  radial-gradient(70% 260% at 0% -20%,rgba(16,185,129,.42),transparent 60%),
  radial-gradient(70% 260% at 100% 150%,rgba(251,191,36,.28),transparent 60%),
  linear-gradient(102deg,#04100c 0%,#0a1a15 46%,#04100c 100%);
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.22),inset 0 1px 0 rgba(255,255,255,.14),
  inset 0 -1px 0 rgba(2,6,23,.6),0 16px 32px -26px #020617;
 -webkit-mask-image:linear-gradient(to right,transparent,#000 2%,#000 98%,transparent);
 mask-image:linear-gradient(to right,transparent,#000 2%,#000 98%,transparent)}
.pv-ride::before{content:"";position:absolute;inset:-14px;z-index:0;
 background-image:radial-gradient(rgba(148,163,184,.28) 1px,transparent 1px);
 background-size:12px 12px;opacity:.35;
 -webkit-mask-image:radial-gradient(closest-side,#000,transparent);
 mask-image:radial-gradient(closest-side,#000,transparent)}
.pv-ride::after{content:"";position:absolute;top:-30%;bottom:-30%;left:0;width:34%;z-index:0;
 background:linear-gradient(100deg,transparent,rgba(52,211,153,.14),rgba(255,255,255,.05),transparent);
 transform:translateX(-140%);animation:pvSweep 6.5s cubic-bezier(.45,0,.55,1) infinite}
@keyframes pvSweep{0%{transform:translateX(-140%)}62%,100%{transform:translateX(380%)}}

.pv-flow{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:space-between;
 padding:0 22px 3px;direction:rtl}

/* المجموع */
.pv-tot{display:flex;align-items:center;gap:9px;flex:0 0 auto}
.pv-ring{position:relative;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}
.pv-ring::before{content:"";position:absolute;inset:0;border-radius:50%;
 background:conic-gradient(from -90deg,#34d399 0 42%,#a3e635 62%,#fbbf24 100%);
 -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0);
 mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0);
 filter:drop-shadow(0 0 7px rgba(52,211,153,.55))}
.pv-ring::after{content:"";position:absolute;inset:4px;border-radius:50%;
 background:radial-gradient(circle at 32% 24%,rgba(16,185,129,.30),rgba(4,12,9,.94) 72%);
 box-shadow:inset 0 0 0 1px rgba(52,211,153,.20)}
.pv-ring b{position:relative;z-index:2;font-size:13px;font-weight:800;color:#f2f8f5;
 font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pv-tot em{font-style:normal;font-size:9px;font-weight:700;color:#8ea3bd;line-height:1.25;max-width:44px}
.pv-div{width:1px;height:26px;flex:0 0 auto;margin:0 14px;
 background:linear-gradient(180deg,transparent,rgba(148,163,184,.4),transparent)}

/* المحطات = حلقات */
.pv-node{display:flex;flex-direction:column;align-items:center;gap:5px;flex:0 0 auto}
.pv-g{--ac:#818cf8;--acg:rgba(129,140,248,.55);position:relative;width:36px;height:36px;
 border-radius:50%;display:grid;place-items:center;
 filter:drop-shadow(0 0 7px var(--acg))}
.pv-g::before{content:"";position:absolute;inset:0;border-radius:50%;
 background:conic-gradient(from -90deg,var(--ac) calc(var(--p) * 1%),rgba(148,163,184,.15) 0);
 -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3.5px),#000 0);
 mask:radial-gradient(farthest-side,transparent calc(100% - 3.5px),#000 0)}
.pv-g::after{content:"";position:absolute;inset:4px;border-radius:50%;
 background:radial-gradient(circle at 32% 22%,rgba(255,255,255,.13),rgba(4,10,16,.92) 74%);
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.18)}
.pv-knob{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;
 border-radius:50%;background:#ffffff;box-shadow:0 0 8px 2px var(--acg);
 transform:rotate(calc(var(--p) * 3.6deg)) translateY(-16px);opacity:1;z-index:1}
.pv-node.zero .pv-knob{opacity:0}
.pv-num{position:relative;z-index:2;font-size:12.5px;font-weight:800;color:#eef4ff;
 font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pv-cap{display:flex;align-items:baseline;gap:4px;white-space:nowrap}
.pv-cap b{font-size:9px;font-weight:700;color:#9fb1c9}
.pv-cap i{font-style:normal;font-size:8px;font-weight:700;color:#7a8ca6}
.pv-node.n1{--ac:#818cf8;--acg:rgba(129,140,248,.55)}
.pv-node.n2{--ac:#a78bfa;--acg:rgba(167,139,250,.5)}
.pv-node.n3{--ac:#38bdf8;--acg:rgba(56,189,248,.5)}
.pv-node.n4{--ac:#34d399;--acg:rgba(52,211,153,.55)}
.pv-g{animation:pvBreathe 4.4s ease-in-out infinite}
.pv-node.n2 .pv-g{animation-delay:.6s}
.pv-node.n3 .pv-g{animation-delay:1.2s}
.pv-node.n4 .pv-g{animation-delay:1.8s}
@keyframes pvBreathe{0%,100%{filter:drop-shadow(0 0 5px var(--acg))}50%{filter:drop-shadow(0 0 12px var(--acg))}}
.pv-node.zero .pv-num{color:#7b8ca6}
.pv-node.zero .pv-g{filter:none}

/* المسار + الحزم اللي كتدوز */
.pv-seg{position:relative;flex:1 1 auto;min-width:24px;height:2px;margin:0 10px;border-radius:2px;
 background-image:repeating-linear-gradient(90deg,rgba(148,163,184,.42) 0 4px,transparent 4px 10px);
 background-size:10px 100%;background-repeat:repeat-x;
 animation:pvTrack 1.05s linear infinite reverse;
 -webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);
 mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
@keyframes pvTrack{from{background-position-x:0}to{background-position-x:10px}}
.pv-seg::before,.pv-seg::after{content:"";position:absolute;top:50%;width:5px;height:5px;border-radius:50%;
 background:#a5b4fc;box-shadow:0 0 9px 1px rgba(129,140,248,.9);transform:translate(-50%,-50%);
 animation:pvPk 2.6s linear infinite;opacity:0}
.pv-seg::after{background:#34d399;box-shadow:0 0 9px 1px rgba(52,211,153,.85);animation-delay:1.3s}
@keyframes pvPk{0%{left:2%;opacity:0}10%{opacity:1}86%{opacity:1}100%{left:98%;opacity:0}}

@media (max-width:1320px){.pv-cap i{display:none}}
@media (max-width:1240px){.pv-tot em,.pv-div{display:none}}
@media (prefers-reduced-motion:reduce){
 .pv-ride::after{display:none}
 .pv-seg,.pv-seg::before,.pv-seg::after,.pv-g{animation:none}
 .pv-seg::before,.pv-seg::after{opacity:.9;left:50%}}
@media (max-width:1000px){.pv-ride{display:none}}
""" + CSS_END

# ─────────────────────────────────────────────────────────────────────────
# 2) السكريبت اللي كيبني الـ HTML بالأرقام
# ─────────────────────────────────────────────────────────────────────────
_ICO = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        'stroke-linecap="round" stroke-linejoin="round">{}</svg>')
PHONE = _ICO.format('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 '
                    '19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11'
                    'L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>')
CHECK = _ICO.format('<path d="M20 6 9 17l-5-5"/>')
BOX = _ICO.format('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73'
                  'l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>')
TRUCK = _ICO.format('<path d="M14 17V6H2v11h1"/><path d="M14 9h4l4 4v4h-2"/>'
                    '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>')

NEW_HELPER = HELP_BEGIN + """
<script id="pv-ride-strip-helper">
/* شريط المسار — كيبني HTML بالأرقام والنسب الحقيقية ديال الطلبيات المعروضة */
(function () {
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function pct(v, t) { return t ? Math.max(0, Math.min(100, Math.round(v * 100 / t))) : 0; }
  function node(cls, val, lab, p) {
    return '<span class="pv-node ' + cls + (val ? '' : ' zero') + '">' +
      '<span class="pv-g" style="--p:' + p + '"><i class="pv-knob"></i><span class="pv-num">' + num(val) + '</span></span>' +
      '<span class="pv-cap"><b>' + lab + '</b><i>' + p + '%</i></span></span>';
  }
  window.__pvRideStrip = function (q) {
    var rows = (q && typeof q.length === 'number') ? q : [];
    var c = { call: 0, conf: 0, ship: 0, liv: 0 }, i, o, t, l, n = rows.length;
    for (i = 0; i < n; i++) {
      o = rows[i] || {};
      t = String(o.statut == null ? '' : o.statut).trim();
      l = String(o.livraison == null ? '' : o.livraison).trim();
      if ((t === '' || /^Appel/i.test(t)) && l === '') { c.call++; }
      if (t === 'Confirmé') { c.conf++; }
      if (l === 'Expédier vers') { c.ship++; }
      if (l === 'Livrée' || l === 'Rechange') { c.liv++; }
    }
    return '<span class="pv-flow">' +
      '<span class="pv-tot"><span class="pv-ring"><b>' + num(n) + '</b></span><em>طلبية معروضة</em></span>' +
      '<span class="pv-div"></span>' +
      node('n1', c.call, 'اتصال', pct(c.call, n)) + '<span class="pv-seg"></span>' +
      node('n2', c.conf, 'تأكيد', pct(c.conf, n)) + '<span class="pv-seg"></span>' +
      node('n3', c.ship, 'إرسال', pct(c.ship, n)) + '<span class="pv-seg"></span>' +
      node('n4', c.liv, 'توصيل', pct(c.liv, n)) +
      '</span>';
  };
})();
</script>
""" + HELP_END

# ─────────────────────────────────────────────────────────────────────────
# 3) العنصر فـ الـ bundle
# ─────────────────────────────────────────────────────────────────────────
NEW_JSX = ('s.jsx("div",{className:"pv-ride","aria-hidden":!0,'
           'dangerouslySetInnerHTML:{__html:(window.__pvRideStrip?window.__pvRideStrip(q):"")}})')

OLD_START = '/* ===== شريط التوصيل — الدار البيضاء ===== */'
OLD_END_MARK = '@media (max-width:1000px){.pv-ride{display:none}}'


def find_css_span(s):
    if CSS_BEGIN in s and CSS_END in s:
        return s.index(CSS_BEGIN), s.index(CSS_END) + len(CSS_END)
    if OLD_START in s:
        a = s.index(OLD_START)
        return a, s.index(OLD_END_MARK, a) + len(OLD_END_MARK)
    return None


def find_element_span(s, idx):
    """يرجع (start,end) ديال العنصر JSX اللي فيه idx، بمطابقة الأقواس."""
    start = s.rindex('s.jsx', 0, idx)
    p = s.index('(', start)
    depth = 0
    i = p
    quote = None
    while i < len(s):
        ch = s[i]
        if quote:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in ('"', "'", '`'):
            quote = ch
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    raise RuntimeError('unbalanced JSX element')


def find_jsx_span(s):
    if 'className:"pv-ride"' not in s:
        return None
    idx = s.index('className:"pv-ride"')
    return find_element_span(s, idx)


def find_helper_span(s):
    if HELP_BEGIN in s and HELP_END in s:
        return s.index(HELP_BEGIN), s.index(HELP_END) + len(HELP_END)
    return None


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    css = find_css_span(s)
    if css is None:
        print("✗ ما لقيتش بلوك CSS ديال pv-ride")
        return 1
    s = s[:css[0]] + NEW_CSS + s[css[1]:]

    jsx = find_jsx_span(s)
    if jsx is None:
        print("✗ ما لقيتش markup ديال pv-ride")
        return 1
    s = s[:jsx[0]] + NEW_JSX + s[jsx[1]:]

    helper = find_helper_span(s)
    if helper is not None:
        s = s[:helper[0]] + NEW_HELPER + s[helper[1]:]
    else:
        head_end = s.rindex('</head>')
        s = s[:head_end] + NEW_HELPER + "\n" + s[head_end:]

    changed = (s != src)
    if check:
        if changed:
            print("✗ index.html ما مطبّقش (شغّل: python3 scripts/patch-ride-strip.py)")
            return 1
        print("✓ شريط Control Tower (بأرقام) مطبّق فـ index.html")
        return 0

    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — Control Tower بأرقام (%d bytes CSS)" % ("تحدّث" if changed else "مضبوط", len(NEW_CSS)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
