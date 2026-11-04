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
/* ===== شريط الحالة — Control Tower (SVG + CSS، أرقام حقيقية) ===== */
.pv-ride{position:relative;flex:1 1 420px;min-width:330px;height:50px;overflow:hidden;
 align-self:center;pointer-events:none;border-radius:12px;isolation:isolate;
 background:
  radial-gradient(120% 180% at 0% 0%,rgba(99,102,241,.42),transparent 58%),
  radial-gradient(120% 180% at 100% 130%,rgba(13,148,136,.30),transparent 56%),
  linear-gradient(102deg,#070d19 0%,#0d1a2f 48%,#070d19 100%);
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.24),inset 0 1px 0 rgba(255,255,255,.10),
  inset 0 -1px 0 rgba(2,6,23,.55),0 10px 24px -20px #020617;
 -webkit-mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent);
 mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent)}
/* شبكة نقطية */
.pv-ride::before{content:"";position:absolute;inset:-14px;z-index:0;
 background-image:radial-gradient(rgba(148,163,184,.30) 1px,transparent 1px);
 background-size:13px 13px;opacity:.42;
 -webkit-mask-image:radial-gradient(closest-side,#000,transparent);
 mask-image:radial-gradient(closest-side,#000,transparent)}
/* شعاع ضوئي كيدوز */
.pv-ride::after{content:"";position:absolute;top:-25%;bottom:-25%;left:0;width:36%;z-index:0;
 background:linear-gradient(100deg,transparent,rgba(165,180,252,.16),rgba(255,255,255,.05),transparent);
 transform:translateX(-140%);animation:pvSweep 7s cubic-bezier(.45,0,.55,1) infinite}
@keyframes pvSweep{0%{transform:translateX(-140%)}60%,100%{transform:translateX(370%)}}

/* المسار (اتصال → تأكيد → إرسال → توصيل)، من اليمين لليسار */
.pv-flow{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:space-between;
 padding:0 26px;direction:rtl}
.pv-node{display:flex;flex-direction:row;align-items:center;gap:7px;flex:0 0 auto}
.pv-node i{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:#e2e9ff;
 flex:0 0 auto;
 background:linear-gradient(160deg,rgba(99,102,241,.45),rgba(8,15,29,.80));
 box-shadow:inset 0 0 0 1px rgba(129,140,248,.50),0 0 14px -7px rgba(99,102,241,.95);
 animation:pvPulse 5s ease-in-out infinite}
.pv-node i svg{width:13px;height:13px;display:block}
.pv-meta{display:flex;flex-direction:column;line-height:1.05}
.pv-val{font-size:13.5px;font-weight:800;color:#eef3ff;font-variant-numeric:tabular-nums;
 letter-spacing:-.01em;white-space:nowrap}
.pv-lab{font-size:9px;font-weight:700;color:#9db0ca;margin-top:2px;white-space:nowrap}
.pv-node.zero .pv-val{color:#8394ad}
.pv-node.n2 i{animation-delay:.55s}
.pv-node.n3 i{animation-delay:1.1s}
.pv-node.n4 i{animation-delay:1.65s}
.pv-node.n4 i{background:linear-gradient(160deg,rgba(16,185,129,.45),rgba(8,15,29,.80));
 box-shadow:inset 0 0 0 1px rgba(52,211,153,.48),0 0 14px -7px rgba(16,185,129,.95)}
@keyframes pvPulse{
 0%,74%,100%{box-shadow:inset 0 0 0 1px rgba(129,140,248,.45),0 0 14px -7px rgba(99,102,241,.85)}
 12%{box-shadow:inset 0 0 0 1px rgba(199,210,254,.95),0 0 22px -3px rgba(129,140,248,1)}}

/* المسار المتقطّع اللي كيتحرك */
.pv-seg{flex:1 1 auto;min-width:24px;height:2px;border-radius:2px;margin:0 14px;
 background-image:repeating-linear-gradient(90deg,rgba(139,150,255,.85) 0 5px,rgba(99,102,241,.14) 5px 12px);
 background-size:12px 100%;background-repeat:repeat-x;
 animation:pvTrack 1.15s linear infinite;animation-direction:reverse;
 -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
 mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
@keyframes pvTrack{from{background-position-x:0}to{background-position-x:12px}}

@media (prefers-reduced-motion:reduce){
 .pv-ride::after{display:none}
 .pv-node i,.pv-seg{animation:none}}
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
/* شريط الطلبيات — كيبني HTML بالأرقام الحقيقية ديال نفس الطلبيات المعروضة */
(function () {
  function num(n) { return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' '); }
  var ICO = {
    phone: '""" + PHONE + """',
    check: '""" + CHECK + """',
    box: '""" + BOX + """',
    truck: '""" + TRUCK + """'
  };
  function node(cls, ico, val, lab) {
    return '<span class="pv-node ' + cls + (val ? '' : ' zero') + '"><i>' + ico + '</i>' +
      '<span class="pv-meta"><span class="pv-val">' + num(val) + '</span>' +
      '<span class="pv-lab">' + lab + '</span></span></span>';
  }
  window.__pvRideStrip = function (q) {
    var rows = (q && typeof q.length === 'number') ? q : [];
    var c = { call: 0, conf: 0, ship: 0, liv: 0 }, i, o, t, l;
    for (i = 0; i < rows.length; i++) {
      o = rows[i] || {};
      t = String(o.statut == null ? '' : o.statut).trim();
      l = String(o.livraison == null ? '' : o.livraison).trim();
      if ((t === '' || /^Appel/i.test(t)) && l === '') { c.call++; }
      if (t === 'Confirmé') { c.conf++; }
      if (l === 'Expédier vers') { c.ship++; }
      if (l === 'Livrée' || l === 'Rechange') { c.liv++; }
    }
    return '<span class="pv-flow">' +
      node('n1', ICO.phone, c.call, 'اتصال') + '<span class="pv-seg s1"></span>' +
      node('n2', ICO.check, c.conf, 'تأكيد') + '<span class="pv-seg s2"></span>' +
      node('n3', ICO.box, c.ship, 'إرسال') + '<span class="pv-seg s3"></span>' +
      node('n4', ICO.truck, c.liv, 'توصيل') +
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
