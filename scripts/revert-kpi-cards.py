#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
revert-kpi-cards.py — كيرجّع بطاقات KPI للشكل الأصلي (المربعات الملوّنة) بحال ما كانو.

كيحيّد البلوك اللي كان كيزيدو patch-kpi-cards.py:
    <style>/*PV-KPICARDS:BEGIN*/ … /*PV-KPICARDS:END*/</style>

    python3 scripts/revert-kpi-cards.py
    python3 scripts/revert-kpi-cards.py --check

idempotent — يلا البلوك ماكاينش، ما كيدير والو.
"""
import sys, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-KPICARDS:BEGIN*/", "/*PV-KPICARDS:END*/"


def strip_block(s):
    b = s.find(CSS_BEGIN)
    if b < 0:
        return s
    e = s.find(CSS_END, b)
    if e < 0:
        return s
    e += len(CSS_END)
    start, end = b, e
    # حيّد <style> … </style> الملّفة يلا كانت غير للبلوك هادا
    m = re.search(r"<style>\s*$", s[:b])
    if m and s[e:e + 20].lstrip().startswith("</style>"):
        start = m.start()
        end = s.index("</style>", e) + len("</style>")
        if s[end:end + 1] == "\n":
            end += 1
    return s[:start] + s[end:]


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = strip_block(src)
    changed = s != src
    if check:
        if changed:
            print("✗ بلوك KPI مازال موجود (شغّل: python3 scripts/revert-kpi-cards.py)")
            return 1
        print("✓ بطاقات KPI رجعو للشكل الأصلي")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — بطاقات KPI (الشكل الأصلي)" % ("ترجّعو" if changed else "مضبوطين"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
