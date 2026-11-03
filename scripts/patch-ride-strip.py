#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-ride-strip.py — كيبدل «شريط الشارع» (pv-street / pv-rider / pv-client)
فـ شريط أدوات الطلبيات بـ «Control Tower» احترافي: SVG + CSS خالص، بلا حتى صورة.

    python3 scripts/patch-ride-strip.py
    python3 scripts/patch-ride-strip.py --check   # واش مطبّق

idempotent: كيستعمل علامات /*PV-RIDE:BEGIN*/ … /*PV-RIDE:END*/.
"""
import sys, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN = "/*PV-RIDE:BEGIN*/"
CSS_END = "/*PV-RIDE:END*/"

NEW_CSS = CSS_BEGIN + """
/* ===== شريط الحالة — Control Tower (SVG + CSS، بلا صور) ===== */
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
 padding:0 42px;direction:rtl}
.pv-node{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
 height:100%;flex:0 0 auto;padding:0 0 7px}
.pv-node i{display:grid;place-items:center;width:23px;height:23px;border-radius:8px;color:#e2e9ff;flex:0 0 auto;
 background:linear-gradient(160deg,rgba(99,102,241,.42),rgba(8,15,29,.78));
 box-shadow:inset 0 0 0 1px rgba(129,140,248,.48),0 0 14px -6px rgba(99,102,241,.95);
 animation:pvPulse 5s ease-in-out infinite}
.pv-node i svg{width:13px;height:13px;display:block}
.pv-node b{display:block;font-size:9.5px;font-weight:700;color:#cbd7ea;line-height:1.4;letter-spacing:0;
 white-space:nowrap}
.pv-node.n2 i{animation-delay:.55s}
.pv-node.n3 i{animation-delay:1.1s}
.pv-node.n4 i{animation-delay:1.65s}
.pv-node.n4 i{background:linear-gradient(160deg,rgba(16,185,129,.42),rgba(8,15,29,.78));
 box-shadow:inset 0 0 0 1px rgba(52,211,153,.45),0 0 14px -6px rgba(16,185,129,.9)}
@keyframes pvPulse{
 0%,74%,100%{box-shadow:inset 0 0 0 1px rgba(129,140,248,.45),0 0 14px -6px rgba(99,102,241,.85)}
 12%{box-shadow:inset 0 0 0 1px rgba(199,210,254,.95),0 0 22px -2px rgba(129,140,248,1)}}
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

NEW_HTML = ('<span class="pv-flow">'
            '<span class="pv-node n1"><i>' + PHONE + '</i><b>اتصال</b></span>'
            '<span class="pv-seg s1"></span>'
            '<span class="pv-node n2"><i>' + CHECK + '</i><b>تأكيد</b></span>'
            '<span class="pv-seg s2"></span>'
            '<span class="pv-node n3"><i>' + BOX + '</i><b>إرسال</b></span>'
            '<span class="pv-seg s3"></span>'
            '<span class="pv-node n4"><i>' + TRUCK + '</i><b>توصيل</b></span>'
            '</span>')

NEW_JSX = ('s.jsxs("div",{className:"pv-ride","aria-hidden":!0,children:['
           's.jsx("span",{dangerouslySetInnerHTML:{__html:\'' + NEW_HTML + '\'}})]})')

OLD_START = '/* ===== شريط التوصيل — الدار البيضاء ===== */'
OLD_END_MARK = '@media (max-width:1000px){.pv-ride{display:none}}'


def find_css_span(s):
    """يرجع (start,end) ديال بلوك CSS القديم ولا الجديد."""
    if CSS_BEGIN in s and CSS_END in s:
        a = s.index(CSS_BEGIN)
        b = s.index(CSS_END) + len(CSS_END)
        return a, b
    if OLD_START in s:
        a = s.index(OLD_START)
        b = s.index(OLD_END_MARK, a) + len(OLD_END_MARK)
        return a, b
    return None


def find_jsx_span(s):
    """يرجع (start,end) ديال markup ديال pv-ride فـ bundle."""
    pat = 's.jsxs("div",{className:"pv-ride"'
    if pat not in s:
        return None
    a = s.index(pat)
    b = s.index(']})', a) + 3
    return a, b


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

    changed = (s != src)
    if check:
        if changed:
            print("✗ index.html ما مطبّقش (شغّل: python3 scripts/patch-ride-strip.py)")
            return 1
        print("✓ شريط Control Tower مطبّق فـ index.html")
        return 0

    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — Control Tower (%d bytes)" % ("تحدّث" if changed else "مضبوط", len(NEW_CSS)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
