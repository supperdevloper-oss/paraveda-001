#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-remove-kpi-scope.py — كيحيّد سطر «الأرقام محسوبة على: …» من فوق بطاقات KPI
باش البطاقات تطلع الفوق وتستغل الفراغ.

    python3 scripts/patch-remove-kpi-scope.py
    python3 scripts/patch-remove-kpi-scope.py --check

idempotent — كيتعرّف على العنصر بـ className:"pvk-scope".
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-KPI-SCOPE:BEGIN*/", "/*PV-KPI-SCOPE:END*/"
NEEDLE = 'className:"pvk-scope"'

NEW_CSS = CSS_BEGIN + r"""
/* ===== حيّدنا سطر «الأرقام محسوبة على» وكملنا الفراغ ===== */
.pvk-bar{padding-top:0!important}
.pvk-scope{display:none!important}
""" + CSS_END


def element_span(s, idx):
    """(start,end) ديال نداء s.jsxs(...) اللي فيه idx، مع الفاصلة اللي من بعدو."""
    start = s.rindex("s.jsx", 0, idx)
    p = s.index("(", start)
    depth, i, quote = 0, p, None
    while i < len(s):
        ch = s[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in ('"', "'", "`"):
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    else:
        raise RuntimeError("unbalanced")
    if end < len(s) and s[end] == ",":
        end += 1
    return start, end


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    if NEEDLE in s:
        a, b = element_span(s, s.index(NEEDLE))
        s = s[:a] + s[b:]
        # فاصلة زايدة محتملة فـ الأول ديال المصفوفة
        s = s.replace('children:[,s.jsx("div",{className:"pvk-wrap"', 'children:[s.jsx("div",{className:"pvk-wrap"')

    if CSS_BEGIN in s and CSS_END in s:
        i, j = s.index(CSS_BEGIN), s.index(CSS_END) + len(CSS_END)
        s = s[:i] + NEW_CSS + s[j:]
    elif "/*PV-HDRLOGO:END*/" in s:
        a = s.index("/*PV-HDRLOGO:END*/") + len("/*PV-HDRLOGO:END*/")
        s = s[:a] + "\n" + NEW_CSS + s[a:]
    else:
        head = s.rindex("</head>")
        s = s[:head] + "<style>" + NEW_CSS + "</style>\n" + s[head:]

    changed = s != src
    if check:
        if changed:
            print("✗ سطر «الأرقام محسوبة على» مازال كاين (شغّل: python3 scripts/patch-remove-kpi-scope.py)")
            return 1
        print("✓ سطر «الأرقام محسوبة على» محيّد")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — تحياد سطر KPI" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
