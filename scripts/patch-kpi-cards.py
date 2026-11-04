#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-kpi-cards.py — شريط KPI «AI CONSOLE»: شريط واحد متواصل مقسّم بخطوط رقيقة (بلا مربعات/توهّجات)
متوافق مع الوضع الليلي (theme-aware) وباقي الهوية.

    python3 scripts/patch-kpi-cards.py
    python3 scripts/patch-kpi-cards.py --check

idempotent — علامات /*PV-KPICARDS:BEGIN*/ … /*PV-KPICARDS:END*/ قبل </head>.
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-KPICARDS:BEGIN*/", "/*PV-KPICARDS:END*/"

NEW_CSS = CSS_BEGIN + r"""
/* ===== شريط KPI — «AI CONSOLE» (شريط متواصل + خطوط رقيقة + أرقام كبيرة) ===== */
.pvk-bar{
 --k-line:rgba(15,23,42,.10);
 --k-ink:#0b1220; --k-mut:#5f6f80; --k-dim:#8b98a6;
 padding:0!important;
 background:#fff!important;
 background-image:linear-gradient(180deg,#fcfdfe 0%,#ffffff 100%)!important;
 border-bottom:1px solid rgba(15,23,42,.08)!important;
 box-shadow:none!important}
html[data-pv-theme="dark"] .pvk-bar{
 --k-line:rgba(255,255,255,.072);
 --k-ink:#f3f8fc; --k-mut:#8ba0b1; --k-dim:#6b7c8c;
 background:#080e13!important;
 background-image:linear-gradient(180deg,#0b1219 0%,#070c11 100%)!important;
 border-bottom-color:rgba(255,255,255,.06)!important}

.pvk-wrap{gap:0!important}

.pvk{
 position:relative;
 background:none!important;
 border:0;border-bottom:1px solid var(--k-line);
 border-radius:0!important;
 box-shadow:none!important;
 min-height:88px!important;
 padding:13px 16px!important;
 text-align:start!important;
 isolation:auto;
 transition:background .16s ease,box-shadow .16s ease!important}
/* خطوط الفصل بين الأعمدة فكل مقاس (RTL: inline-start = اليمين) */
.pvk{border-inline-start:0}
@media(max-width:639px){
 .pvk:nth-child(2n){border-inline-start:1px solid var(--k-line)}}
@media(min-width:640px) and (max-width:1279px){
 .pvk:nth-child(3n+2),.pvk:nth-child(3n){border-inline-start:1px solid var(--k-line)}}
@media(max-width:1279px){
 .pvk{min-height:80px!important;padding:11px 15px!important}}
@media(min-width:1280px){
 .pvk{border-bottom:0}
 .pvk:nth-child(n+2){border-inline-start:1px solid var(--k-line)}}
.pvk:hover{transform:none!important;background:rgba(15,23,42,.026)!important;box-shadow:none!important}
html[data-pv-theme="dark"] .pvk-bar .pvk:hover{background:rgba(255,255,255,.036)!important}
.pvk.is-on{background:color-mix(in srgb,var(--pvk) 6%,transparent)!important;box-shadow:none!important}
.pvk.is-on::before{content:"";display:block!important;position:absolute;inset-block:0;inset-inline-start:0;
 width:2px;background:var(--pvk)}
.pvk.is-on .pvk-lab{color:var(--pvk)!important;filter:brightness(.74) saturate(1.15)!important}
.pvk.is-on .pvk-ico{opacity:1}
.pvk-glow,.pvk::before,.pvk::after{display:none!important}

.pvk-top{display:flex!important;align-items:flex-start!important;gap:10px;position:relative!important;
 text-align:start!important}
.pvk-ico{position:static!important;flex:0 0 auto!important;top:auto!important;
 width:16px!important;height:16px!important;margin-top:1px;
 background:none!important;box-shadow:none!important;border-radius:0!important;
 color:var(--pvk)!important;opacity:.9;transform:none!important}
.pvk-ico svg{width:16px!important;height:16px!important;stroke-width:1.9!important}
.pvk:hover .pvk-ico{opacity:1;transform:none!important}

.pvk-mid{display:block!important;flex:1 1 auto!important;min-width:0!important;padding:0!important;
 text-align:start!important}
.pvk-lab{display:block;color:var(--k-mut)!important;filter:none!important;
 font-size:9px!important;font-weight:700!important;letter-spacing:.14em!important;
 line-height:1.4!important;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;
 padding-inline-end:0!important}
.pvk-val{color:var(--k-ink)!important;
 font-size:26px!important;font-weight:700!important;letter-spacing:-.025em!important;
 line-height:1!important;margin-top:8px!important;text-align:start!important;
 text-shadow:none!important;font-variant-numeric:tabular-nums}
.pvk-desc{color:var(--k-dim)!important;
 font-size:10px!important;font-weight:500!important;letter-spacing:0;
 margin-top:8px!important;margin-inline-start:26px!important;text-align:start!important;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvk-arw{display:none!important}

.pvk-badge{background:transparent!important;box-shadow:none!important;
 padding:0!important;border-radius:0!important;
 margin:8px 0 0!important;margin-inline-start:26px!important;
 font-size:10px!important;font-weight:700!important;letter-spacing:.01em}
.pvk-badge.up{color:#0b8f5f!important}
.pvk-badge.dn{color:#c22a2a!important}
html[data-pv-theme="dark"] .pvk-bar .pvk-lab{color:var(--k-mut)!important;filter:none!important}
html[data-pv-theme="dark"] .pvk-bar .pvk-val{color:var(--k-ink)!important}
html[data-pv-theme="dark"] .pvk-bar .pvk-ico{box-shadow:none!important;background:none!important}
html[data-pv-theme="dark"] .pvk-bar .pvk.is-on .pvk-lab{color:var(--pvk)!important;filter:brightness(1.45) saturate(1.1)!important}
html[data-pv-theme="dark"] .pvk-bar .pvk-badge.up{color:#3ddc97!important;background:transparent!important}
html[data-pv-theme="dark"] .pvk-bar .pvk-badge.dn{color:#ff8f8f!important;background:transparent!important}

/* الموبايل: تصغير بلا قطع الأرقام */
@media(max-width:639px){
 .pvk{padding:11px 12px!important;min-height:0!important}
 .pvk-top{gap:8px}
 .pvk-bar .pvk-lab{white-space:normal!important;overflow:visible!important;
  font-size:8.5px!important;letter-spacing:.1em!important;line-height:1.3!important}
 .pvk-bar .pvk-val{font-size:21px!important;margin-top:6px!important;letter-spacing:-.02em!important}
 .pvk-bar .pvk-desc{font-size:9px!important;margin-top:6px!important;margin-inline-start:24px!important}
 .pvk-bar .pvk-badge{font-size:9px!important;margin-inline-start:24px!important}}
@media (prefers-reduced-motion:reduce){.pvk{transition:none!important}}
""" + CSS_END


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    blk_start = s.find(CSS_BEGIN)
    blk_end = s.find(CSS_END)
    if blk_start >= 0 and blk_end > blk_start:
        s = s[:blk_start] + NEW_CSS + s[blk_end + len(CSS_END):]
    else:
        head = s.rindex("</head>")
        s = s[:head] + "<style>" + NEW_CSS + "</style>\n" + s[head:]

    changed = s != src
    if check:
        if changed:
            print("✗ شريط KPI الجديد ما مطبّق (شغّل: python3 scripts/patch-kpi-cards.py)")
            return 1
        print("✓ شريط KPI «AI Console» مطبّق")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — شريط KPI (AI Console)" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
