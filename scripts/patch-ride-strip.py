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
/* ===== شريط الحالة — Control Tower (SVG + CSS، أرقام + نسب حقيقية) ===== */
.pv-ride{position:relative;flex:1 1 430px;min-width:340px;height:54px;overflow:hidden;
 align-self:center;pointer-events:none;border-radius:13px;isolation:isolate;
 background:
  radial-gradient(80% 240% at 0% -10%,rgba(99,102,241,.52),transparent 62%),
  radial-gradient(80% 240% at 100% 140%,rgba(20,184,166,.34),transparent 58%),
  linear-gradient(102deg,#050a14 0%,#0c1830 46%,#050a14 100%);
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.22),inset 0 1px 0 rgba(255,255,255,.14),
  inset 0 -1px 0 rgba(2,6,23,.6),0 14px 30px -24px #020617;
 -webkit-mask-image:linear-gradient(to right,transparent,#000 2%,#000 98%,transparent);
 mask-image:linear-gradient(to right,transparent,#000 2%,#000 98%,transparent)}
/* شبكة نقطية */
.pv-ride::before{content:"";position:absolute;inset:-14px;z-index:0;
 background-image:radial-gradient(rgba(148,163,184,.30) 1px,transparent 1px);
 background-size:13px 13px;opacity:.40;
 -webkit-mask-image:radial-gradient(closest-side,#000,transparent);
 mask-image:radial-gradient(closest-side,#000,transparent)}
/* شعاع ضوئي كيدوز */
.pv-ride::after{content:"";position:absolute;top:-25%;bottom:-25%;left:0;width:36%;z-index:0;
 background:linear-gradient(100deg,transparent,rgba(165,180,252,.16),rgba(255,255,255,.05),transparent);
 transform:translateX(-140%);animation:pvSweep 7s cubic-bezier(.45,0,.55,1) infinite}
@keyframes pvSweep{0%{transform:translateX(-140%)}60%,100%{transform:translateX(370%)}}

/* المسار (المجموع → اتصال → تأكيد → إرسال → توصيل)، من اليمين لليسار */
.pv-flow{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:space-between;
 padding:0 26px;direction:rtl}
/* خيط ضوئي فوق */
.pv-hair{position:absolute;left:26px;right:26px;top:0;height:1px;pointer-events:none;
 background:linear-gradient(90deg,transparent,rgba(165,180,252,.55) 22%,rgba(45,212,191,.45) 62%,transparent)}
/* المجموع */
.pv-tot{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.pv-dot{width:6px;height:6px;border-radius:50%;background:#34d399;flex:0 0 auto;
 box-shadow:0 0 0 3px rgba(52,211,153,.16),0 0 12px rgba(52,211,153,.9);
 animation:pvLive 2.6s ease-in-out infinite}
@keyframes pvLive{0%,100%{box-shadow:0 0 0 3px rgba(52,211,153,.16),0 0 12px rgba(52,211,153,.9)}
 50%{box-shadow:0 0 0 6px rgba(52,211,153,.06),0 0 4px rgba(52,211,153,.55)}}
.pv-tmeta{display:flex;flex-direction:column;line-height:1.05}
.pv-tmeta b{font-size:14px;font-weight:800;color:#f2f6ff;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.pv-tmeta em{font-size:8.5px;font-style:normal;font-weight:700;color:#8fa3bf;margin-top:3px;letter-spacing:.01em}
.pv-div{width:1px;height:26px;flex:0 0 auto;margin:0 15px;
 background:linear-gradient(180deg,transparent,rgba(148,163,184,.45),transparent)}

/* المحطات */
.pv-node{display:flex;flex-direction:row;align-items:center;gap:8px;flex:0 0 auto}
.pv-node i{position:relative;display:grid;place-items:center;width:26px;height:26px;border-radius:9px;
 flex:0 0 auto;color:#e9eeff;--pv-ac:#818cf8;
 background:linear-gradient(160deg,rgba(99,102,241,.42),rgba(6,12,25,.92));
 box-shadow:inset 0 0 0 1px rgba(129,140,248,.40),0 6px 14px -10px #000;
 animation:pvPulse 5.2s ease-in-out infinite}
/* حلقة النسبة (conic) */
.pv-node i::after{content:"";position:absolute;inset:-3.5px;border-radius:13px;padding:1.5px;
 background:conic-gradient(from 210deg,var(--pv-ac) var(--p,0%),rgba(148,163,184,.20) 0);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
 -webkit-mask-composite:xor;
 mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
 mask-composite:exclude}
.pv-node i svg{width:13px;height:13px;display:block}
.pv-meta{display:flex;flex-direction:column;line-height:1}
.pv-val{font-size:16px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;
 white-space:nowrap;background:linear-gradient(180deg,#ffffff,#c9d5f8);
 -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.pv-lab{font-size:9px;font-weight:700;color:#9db0ca;margin-top:3px;white-space:nowrap;letter-spacing:.01em}
.pv-num{display:flex;align-items:baseline;gap:5px}
.pv-pct{font-size:8px;font-weight:700;letter-spacing:0;color:#8ea2bd;-webkit-text-fill-color:#8ea2bd;
 background:none;transform:translateY(-1px)}
.pv-node.zero .pv-pct{color:#6f809a;-webkit-text-fill-color:#6f809a}
.pv-node.zero .pv-val{background:none;-webkit-text-fill-color:#7c8da6;color:#7c8da6}
.pv-node.zero i::after{background:conic-gradient(rgba(148,163,184,.20) 0 100%)}
.pv-node.n2{--pv-ac:#a78bfa}
.pv-node.n2 i{animation-delay:.5s}
.pv-node.n3{--pv-ac:#38bdf8}
.pv-node.n3 i{animation-delay:1s;background:linear-gradient(160deg,rgba(56,189,248,.34),rgba(6,12,25,.92))}
.pv-node.n4{--pv-ac:#34d399}
.pv-node.n4 i{animation-delay:1.5s;background:linear-gradient(160deg,rgba(16,185,129,.40),rgba(6,12,25,.92))}
@keyframes pvPulse{
 0%,76%,100%{box-shadow:inset 0 0 0 1px rgba(129,140,248,.34),0 6px 14px -10px #000}
 12%{box-shadow:inset 0 0 0 1px rgba(199,210,254,.85),0 0 18px -4px rgba(129,140,248,.9)}}

/* المسار المتقطّع اللي كيتحرك */
.pv-seg{flex:1 1 auto;min-width:20px;height:2px;border-radius:2px;margin:0 13px;
 background-image:repeating-linear-gradient(90deg,rgba(139,150,255,.80) 0 5px,rgba(99,102,241,.12) 5px 12px);
 background-size:12px 100%;background-repeat:repeat-x;
 animation:pvTrack 1.15s linear infinite;animation-direction:reverse;
 -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
 mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
@keyframes pvTrack{from{background-position-x:0}to{background-position-x:12px}}

@media (max-width:1240px){.pv-tot,.pv-div{display:none}}
@media (max-width:1320px){.pv-pct{display:none}}
@media (prefers-reduced-motion:reduce){
 .pv-ride::after{display:none}
 .pv-node i,.pv-seg,.pv-dot{animation:none}}
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
/* شريط الطلبيات — كيبني HTML بالأرقام والنسب الحقيقية ديال الطلبيات المعروضة */
(function () {
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  var ICO = {
    phone: '""" + PHONE + """',
    check: '""" + CHECK + """',
    box: '""" + BOX + """',
    truck: '""" + TRUCK + """'
  };
  function pct(v, t) { return t ? Math.max(0, Math.min(100, Math.round(v * 100 / t))) : 0; }
  function node(cls, ico, val, lab, p) {
    return '<span class="pv-node ' + cls + (val ? '' : ' zero') + '">' +
      '<i style="--p:' + p + '%">' + ico + '</i>' +
      '<span class="pv-meta"><span class="pv-num"><span class="pv-val">' + num(val) +
        '</span><span class="pv-pct">' + p + '%</span></span>' +
      '<span class="pv-lab">' + lab + '</span></span></span>';
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
    return '<span class="pv-flow"><span class="pv-hair"></span>' +
      '<span class="pv-tot"><span class="pv-dot"></span><span class="pv-tmeta">' +
        '<b>' + num(n) + '</b><em>طلبية معروضة</em></span></span>' +
      '<span class="pv-div"></span>' +
      node('n1', ICO.phone, c.call, 'اتصال', pct(c.call, n)) + '<span class="pv-seg s1"></span>' +
      node('n2', ICO.check, c.conf, 'تأكيد', pct(c.conf, n)) + '<span class="pv-seg s2"></span>' +
      node('n3', ICO.box, c.ship, 'إرسال', pct(c.ship, n)) + '<span class="pv-seg s3"></span>' +
      node('n4', ICO.truck, c.liv, 'توصيل', pct(c.liv, n)) +
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
