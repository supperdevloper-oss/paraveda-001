#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-brand-splash.py — هوية «AI Commerce»: favicon + شاشة إقلاع (splash).

    python3 scripts/patch-brand-splash.py
    python3 scripts/patch-brand-splash.py --check

idempotent — علامات /*PV-BRAND:BEGIN*/ و <!--PV-BRAND-SPLASH:BEGIN-->.
"""
import sys, io, os
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-BRAND:BEGIN*/", "/*PV-BRAND:END*/"
SP_BEGIN, SP_END = "<!--PV-BRAND-SPLASH:BEGIN-->", "<!--PV-BRAND-SPLASH:END-->"
FAV_BEGIN, FAV_END = "<!--PV-BRAND-FAVICON-->", "<!--/PV-BRAND-FAVICON-->"

# ── العلامة (SVG) — نفس ملف deliverables/brand-ai/logo-mark.svg ───────────────
MARK_INNER = """<defs>
      <linearGradient id="pvsE" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#064e3b"/><stop offset=".48" stop-color="#0d9464"/><stop offset="1" stop-color="#34d399"/>
      </linearGradient>
      <radialGradient id="pvsH" cx=".2" cy=".08" r=".95">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".42"/><stop offset=".55" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pvsGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="13" fill="url(#pvsE)"/>
    <rect width="48" height="48" rx="13" fill="url(#pvsH)"/>
    <rect x=".85" y=".85" width="46.3" height="46.3" rx="12.2" fill="none" stroke="url(#pvsGold)" stroke-width="1.3" stroke-opacity=".9"/>
    <g fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 15.2 33.6 20 24 24.8 14.4 20Z"/>
      <path d="M14.4 20v9.6L24 34.4l9.6-4.8V20"/>
      <path d="M24 24.8v9.6"/>
    </g>
    <path d="M20.4 20 24 17.6 27.6 20" fill="none" stroke="#fde68a" stroke-opacity=".95" stroke-width=".95" stroke-linecap="round"/>
    <circle class="pvs-d pvs-d1" cx="20.4" cy="20" r="1.35" fill="#fde68a"/>
    <circle class="pvs-d pvs-d2" cx="27.6" cy="20" r="1.35" fill="#fde68a"/>
    <circle class="pvs-d pvs-d3" cx="24" cy="17.6" r="1.35" fill="#fde68a"/>
    <path d="M38.2 9.4c.5 2.6 1.2 3.3 3.8 3.8-2.6.5-3.3 1.2-3.8 3.8-.5-2.6-1.2-3.3-3.8-3.8 2.6-.5 3.3-1.2 3.8-3.8Z" fill="#fde68a"/>"""

FAVICON_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
               '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
               '<stop offset="0" stop-color="#064e3b"/><stop offset=".48" stop-color="#0d9464"/>'
               '<stop offset="1" stop-color="#34d399"/></linearGradient>'
               '<linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">'
               '<stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></linearGradient></defs>'
               '<rect width="48" height="48" rx="13" fill="url(#g)"/>'
               '<rect x=".85" y=".85" width="46.3" height="46.3" rx="12.2" fill="none" stroke="url(#gg)" stroke-width="1.3"/>'
               '<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'
               '<path d="M24 15.2 33.6 20 24 24.8 14.4 20Z"/><path d="M14.4 20v9.6L24 34.4l9.6-4.8V20"/>'
               '<path d="M24 24.8v9.6"/></g>'
               '<g fill="#fde68a"><circle cx="20.4" cy="20" r="1.5"/><circle cx="27.6" cy="20" r="1.5"/>'
               '<circle cx="24" cy="17.6" r="1.5"/></g>'
               '<path d="M38.2 9.4c.5 2.6 1.2 3.3 3.8 3.8-2.6.5-3.3 1.2-3.8 3.8-.5-2.6-1.2-3.3-3.8-3.8 2.6-.5 3.3-1.2 3.8-3.8Z" fill="#fde68a"/>'
               '</svg>')

FAVICON = (FAV_BEGIN + "\n"
           '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,' + quote(FAVICON_SVG, safe="") + '"/>\n'
           + FAV_END)

HEADER_MARK = (MARK_INNER
               .replace('id="pvsE"', 'id="pvmE"').replace('url(#pvsE)', 'url(#pvmE)')
               .replace('id="pvsH"', 'id="pvmH"').replace('url(#pvsH)', 'url(#pvmH)')
               .replace('id="pvsGold"', 'id="pvmGold"').replace('url(#pvsGold)', 'url(#pvmGold)')
               .replace('class="pvs-d pvs-d1"', '').replace('class="pvs-d pvs-d2"', '')
               .replace('class="pvs-d pvs-d3"', '').replace("\n", " "))

HEADER_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-hidden="true">'
              + HEADER_MARK + '</svg>')
BRAND_GLOBAL_JS = "window.__pvBrandMark = '" + HEADER_SVG + "';"

SPLASH = SP_BEGIN + """
<div id="pv-splash" aria-hidden="true">
  <div class="pvs-glow pvs-g1"></div>
  <div class="pvs-glow pvs-g2"></div>
  <div class="pvs-inner">
    <div class="pvs-badge">
      <span class="pvs-ring"></span>
      <svg class="pvs-mark" viewBox="0 0 48 48" width="88" height="88" role="img" aria-label="Paraveda">
        """ + MARK_INNER + """
      </svg>
    </div>
    <div class="pvs-word">PARAVEDA</div>
    <div class="pvs-tag">AI&nbsp;COMMERCE&nbsp;OS</div>
    <div class="pvs-bar"><i></i></div>
  </div>
</div>
<script id="pv-brand-mark-global">""" + BRAND_GLOBAL_JS + """</script>
<script id="pv-splash-script">
(function () {
  var el = document.getElementById('pv-splash');
  if (!el) return;
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hide() {
    if (!el || !el.parentNode) return;
    el.classList.add('pvs-out');
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, rm ? 160 : 560);
  }
  setTimeout(hide, rm ? 420 : 1550);
  setTimeout(hide, 6000);
})();
</script>
""" + SP_END

NEW_CSS = CSS_BEGIN + r"""
/* ===== هوية AI Commerce — شاشة الإقلاع ===== */
#pv-splash{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;
 background:radial-gradient(120% 120% at 50% 0%,#0b1730 0%,#050a14 62%,#03070f 100%);
 transition:opacity .5s ease,visibility .5s ease}
#pv-splash::before{content:"";position:absolute;inset:-20px;
 background-image:radial-gradient(rgba(148,163,184,.22) 1px,transparent 1px);
 background-size:22px 22px;opacity:.35;
 -webkit-mask-image:radial-gradient(closest-side,#000,transparent 78%);
 mask-image:radial-gradient(closest-side,#000,transparent 78%)}
#pv-splash.pvs-out{opacity:0;visibility:hidden}
.pvs-glow{position:absolute;width:460px;height:460px;border-radius:50%;filter:blur(70px);opacity:.5;pointer-events:none}
.pvs-g1{top:-140px;left:-120px;background:radial-gradient(circle,#10b981,transparent 68%)}
.pvs-g2{bottom:-160px;right:-140px;background:radial-gradient(circle,#f59e0b,transparent 68%)}
.pvs-inner{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px}
.pvs-badge{position:relative;display:grid;place-items:center;width:132px;height:132px;
 animation:pvsIn .75s cubic-bezier(.2,.8,.25,1) both}
.pvs-ring{position:absolute;inset:0;border-radius:38px;
 background:conic-gradient(from 0deg,transparent 0 60%,rgba(52,211,153,.9) 76%,rgba(251,191,36,.95) 88%,transparent 100%);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
 -webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
 mask-composite:exclude;padding:1.6px;animation:pvsSpin 2.6s linear infinite}
@keyframes pvsSpin{to{transform:rotate(360deg)}}
.pvs-mark{width:88px;height:88px;display:block;filter:drop-shadow(0 18px 30px rgba(16,185,129,.42))}
.pvs-d{animation:pvsBlink 1.8s ease-in-out infinite}
.pvs-d1{animation-delay:0s}.pvs-d2{animation-delay:.28s}.pvs-d3{animation-delay:.56s}
@keyframes pvsBlink{0%,72%,100%{opacity:.55}18%{opacity:1}}
.pvs-word{margin-top:6px;font-size:19px;font-weight:800;letter-spacing:.34em;color:#eef3ff;
 text-indent:.34em;animation:pvsUp .7s .12s ease-out both}
.pvs-tag{font-size:9px;font-weight:700;letter-spacing:.34em;color:#7f93ae;text-indent:.34em;
 animation:pvsUp .7s .2s ease-out both}
.pvs-bar{margin-top:16px;width:132px;height:2.5px;border-radius:99px;background:rgba(148,163,184,.18);
 overflow:hidden;animation:pvsUp .7s .26s ease-out both}
.pvs-bar i{display:block;height:100%;width:0;border-radius:99px;
 background:linear-gradient(90deg,#059669,#34d399 52%,#fbbf24);
 box-shadow:0 0 12px rgba(16,185,129,.85);animation:pvsFill 1.25s .15s cubic-bezier(.4,0,.2,1) forwards}
@keyframes pvsFill{to{width:100%}}
@keyframes pvsIn{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes pvsUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
 .pvs-ring,.pvs-d,.pvs-badge,.pvs-word,.pvs-tag,.pvs-bar,.pvs-bar i{animation:none!important}
 .pvs-bar i{width:100%}}
""" + CSS_END


def find_block(s, b, e):
    if b in s and e in s:
        return s.index(b), s.rindex(e) + len(e)
    return None


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    # 1) CSS
    blk = find_block(s, CSS_BEGIN, CSS_END)
    if blk:
        s = s[:blk[0]] + NEW_CSS + s[blk[1]:]
    else:
        anchor = find_block(s, "/*PV-PULSE:BEGIN*/", "/*PV-PULSE:END*/")
        if not anchor:
            print("✗ ما لقيتش بلوك CSS")
            return 1
        s = s[:anchor[1]] + "\n" + NEW_CSS + s[anchor[1]:]

    # 2) splash + favicon
    sp = find_block(s, SP_BEGIN, SP_END)
    if sp:
        s = s[:sp[0]] + SPLASH + s[sp[1]:]
    else:
        b = s.index("<body", s.rindex("</head>"))
        b = s.index(">", b) + 1
        s = s[:b] + "\n" + SPLASH + "\n" + s[b:]

    fv = find_block(s, FAV_BEGIN, FAV_END)
    if fv:
        s = s[:fv[0]] + FAVICON + s[fv[1]:]
    else:
        head = s.rindex("</head>")
        s = s[:head] + FAVICON + "\n" + s[head:]

    changed = s != src
    if check:
        if changed:
            print("✗ هوية AI ما مطبّقة (شغّل: python3 scripts/patch-brand-splash.py)")
            return 1
        print("✓ هوية AI (splash + favicon) مطبّقة فـ index.html")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — هوية AI (splash + favicon)" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
