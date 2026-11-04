#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-kpi-cards.py — كيعطي بطاقات KPI شكل «Control Deck» غامق (زجاج + توهّج + شبكة نقطية)
متوافق مع هوية ORBIT CUBE وشريط NEON GAUGES.

    python3 scripts/patch-kpi-cards.py
    python3 scripts/patch-kpi-cards.py --check

idempotent — علامات /*PV-KPICARDS:BEGIN*/ … /*PV-KPICARDS:END*/ قبل </head>.
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-KPICARDS:BEGIN*/", "/*PV-KPICARDS:END*/"

NEW_CSS = CSS_BEGIN + r"""
/* ===== بطاقات KPI — Control Deck (زجاج غامق + توهّج + شبكة نقطية) ===== */
.pvk{
 background:
   radial-gradient(130% 140% at 0% 0%,var(--pvk-rg),transparent 58%),
   linear-gradient(160deg,#07140f 0%,#0b1e18 58%,#06110d 100%) !important;
 --pvk-bd:rgba(148,163,184,.22) !important;
 min-height:96px!important;
 padding:11px 12px!important;
 border-radius:15px!important;
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.10),inset 0 1px 0 rgba(255,255,255,.08),
  0 12px 26px -22px #020617!important;
 transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease!important;
 isolation:isolate}
/* شبكة نقطية داخلية */
.pvk::before{content:"";position:absolute;inset:-10px;z-index:0;pointer-events:none;
 background-image:radial-gradient(rgba(148,163,184,.20) 1px,transparent 1px);
 background-size:11px 11px;opacity:.45;
 -webkit-mask-image:radial-gradient(120% 120% at 50% 0%,#000 30%,transparent 78%);
 mask-image:radial-gradient(120% 120% at 50% 0%,#000 30%,transparent 78%)}
/* خيط لوني فوق */
.pvk::after{content:"";position:absolute;top:0;inset-inline:0;height:1.5px;z-index:2;
 background:linear-gradient(90deg,var(--pvk),color-mix(in srgb,var(--pvk) 40%,transparent) 38%,transparent 72%);
 opacity:.85;filter:drop-shadow(0 1px 6px var(--pvk-rg))}
.pvk-glow{opacity:.16!important}
.pvk:hover{transform:translateY(-3px)!important;
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.16),0 18px 34px -20px var(--pvk-rg),
  0 0 0 1px var(--pvk)!important}
.pvk:hover .pvk-glow{opacity:.32!important}
.pvk.is-on{border-color:var(--pvk)!important;
 box-shadow:0 0 0 2px var(--pvk-rg),inset 0 0 0 1px var(--pvk),0 18px 34px -20px var(--pvk-rg)!important}

.pvk-ico{background:linear-gradient(160deg,var(--pvk),color-mix(in srgb,var(--pvk) 55%,#04120c))!important;
 box-shadow:0 8px 18px -8px var(--pvk-rg),inset 0 0 0 1px rgba(255,255,255,.18)!important;
 border-radius:10px!important;width:32px!important;height:32px!important}
.pvk-lab{color:var(--pvk)!important;filter:brightness(1.85) saturate(1.25)!important;
 letter-spacing:.1em!important;font-size:8.5px!important;opacity:.95}
.pvk-lab::after{content:"";display:block}
.pvk-val{color:#ffffff!important;font-size:21px!important;letter-spacing:-.03em!important;
 text-shadow:0 1px 12px rgba(255,255,255,.14)}
.pvk-desc{color:#8ea8bd!important;font-size:9.5px!important;opacity:.92}
.pvk-arw{color:#6f8398!important}
.pvk-badge.up{background:rgba(16,185,129,.16)!important;color:#6ee7b7!important;
 box-shadow:inset 0 0 0 1px rgba(52,211,153,.3)}
.pvk-badge.dn{background:rgba(239,68,68,.16)!important;color:#fca5a5!important;
 box-shadow:inset 0 0 0 1px rgba(248,113,113,.3)}
.pvk-top,.pvk-mid,.pvk-desc,.pvk-badge{position:relative;z-index:2}
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
            print("✗ بطاقات KPI الجديدة ما مطبّقة (شغّل: python3 scripts/patch-kpi-cards.py)")
            return 1
        print("✓ بطاقات KPI الجديدة مطبّقة")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — بطاقات KPI (Control Deck)" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
