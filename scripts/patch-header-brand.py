#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-header-brand.py — كيحط علامة «AI Commerce» فـ هيدر التطبيق
(بلاصة الحرف «A» ديال ADMIN)، وكيخلّي صورة المستخدم إلا كانت.

    python3 scripts/patch-header-brand.py
    python3 scripts/patch-header-brand.py --check

كيتطلب: python3 scripts/patch-brand-splash.py (باش يكون window.__pvBrandMark).
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-HDRLOGO:BEGIN*/", "/*PV-HDRLOGO:END*/"

OLD = ('s.jsx("span",{className:"grid h-6 w-6 place-items-center overflow-hidden rounded-full '
       'bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white",'
       'children:c.photo?s.jsx("img",{src:c.photo,alt:"",className:"h-full w-full object-cover"})'
       ':(c.username||"?").charAt(0).toUpperCase()})')

NEW = ('s.jsx("span",{className:"pv-user-chip grid shrink-0 place-items-center overflow-hidden",'
       'children:c.photo?s.jsx("img",{src:c.photo,alt:"",className:"h-full w-full object-cover"})'
       ':s.jsx("span",{className:"pv-user-mark",'
       'dangerouslySetInnerHTML:{__html:(window.__pvBrandMark||"")}})})')

NEW_CSS = CSS_BEGIN + r"""
/* ===== علامة الهيدر (بلاصة الحرف) ===== */
.pv-user-chip{width:26px;height:26px;border-radius:8px;flex:0 0 auto;
 background:linear-gradient(160deg,#064e3b,#0d9464);
 box-shadow:0 2px 6px -3px rgba(4,120,87,.55),inset 0 0 0 1px rgba(251,191,36,.35)}
.pv-user-mark{display:block;width:100%;height:100%}
.pv-user-mark svg{display:block;width:100%;height:100%}
""" + CSS_END


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    if "window.__pvBrandMark" not in s:
        print("✗ window.__pvBrandMark ما كاينش — شغّل: python3 scripts/patch-brand-splash.py")
        return 1

    if 'className:"pv-user-mark"' in s:
        # نصلحو الـ className إلا كان فيه قيم Tailwind ماشي فـ البيلد
        for bad in ('className:"pv-user-chip grid h-[26px] w-[26px] shrink-0 place-items-center '
                    'overflow-hidden rounded-[8px] ring-1 ring-slate-900/10"',
                    'className:"pv-user-chip grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-[8px] ring-1 ring-slate-900/10"'):
            s = s.replace(bad, 'className:"pv-user-chip grid shrink-0 place-items-center overflow-hidden"')
    elif OLD in s:
        s = s.replace(OLD, NEW, 1)
    else:
        print("✗ ما لقيتش الأفاتار فـ الهيدر")
        return 1

    if CSS_BEGIN in s and CSS_END in s:
        i, j = s.index(CSS_BEGIN), s.index(CSS_END) + len(CSS_END)
        s = s[:i] + NEW_CSS + s[j:]
    else:
        anchor = s.rindex("/*PV-BRAND:END*/") + len("/*PV-BRAND:END*/")
        s = s[:anchor] + "\n" + NEW_CSS + s[anchor:]

    changed = s != src
    if check:
        if changed:
            print("✗ علامة الهيدر ما مطبّقة (شغّل: python3 scripts/patch-header-brand.py)")
            return 1
        print("✓ علامة الهيدر مطبّقة")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — علامة الهيدر" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
