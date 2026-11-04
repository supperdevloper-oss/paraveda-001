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
@media(min-width:1280px){
 .pvk{border-bottom:0}
 .pvk:nth-child(n+2){border-inline-start:1px solid var(--k-line)}}
.pvk:hover{transform:none!important;background:rgba(15,23,42,.026)!important;box-shadow:none!important}
html[data-pv-theme="dark"] .pvk:hover{background:rgba(255,255,255,.036)!important}
.pvk.is-on{background:color-mix(in srgb,var(--pvk) 7%,transparent)!important;
 box-shadow:inset 0 -2px 0 var(--pvk)!important;border-color:var(--k-line)}
.pvk-glow,.pvk::before,.pvk::after{display:none!important}

.pvk-top{display:block!important;position:relative!important;text-align:start!important}
.pvk-ico{position:absolute!important;inset-inline-end:0!important;inset-inline-start:auto!important;top:0!important;
 width:16px!important;height:16px!important;
 background:none!important;box-shadow:none!important;border-radius:0!important;
 color:var(--pvk)!important;opacity:.95;transform:none!important}
.pvk-ico svg{width:16px!important;height:16px!important;stroke-width:1.9!important}
.pvk:hover .pvk-ico{opacity:1;transform:none!important}

.pvk-mid{display:block!important;padding:0!important;text-align:start!important}
.pvk-lab{color:var(--k-mut)!important;filter:none!important;
 font-size:9px!important;font-weight:700!important;letter-spacing:.14em!important;
 line-height:1.35!important;white-space:nowrap!important;
 padding-inline-end:24px}
.pvk-val{color:var(--k-ink)!important;
 font-size:26px!important;font-weight:700!important;letter-spacing:-.025em!important;
 line-height:1!important;margin-top:9px!important;text-align:start!important;
 text-shadow:none!important;font-variant-numeric:tabular-nums}
.pvk-desc{color:var(--k-dim)!important;
 font-size:10px!important;font-weight:500!important;letter-spacing:0;
 margin-top:8px!important;text-align:start!important;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvk-arw{display:none!important}

.pvk-badge{background:transparent!important;box-shadow:none!important;
 padding:0!important;border-radius:0!important;
 margin:8px 0 0!important;margin-inline:0!important;
 font-size:10px!important;font-weight:700!important;letter-spacing:.01em}
.pvk-badge.up{color:#0b8f5f!important}
.pvk-badge.dn{color:#c22a2a!important}
html[data-pv-theme="dark"] .pvk-badge.up{color:#3ddc97!important}
html[data-pv-theme="dark"] .pvk-badge.dn{color:#ff8f8f!important}

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
