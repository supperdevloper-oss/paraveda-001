#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# Paraveda CRM — إضافة تبويب «Performance» للـ SPA
#
# كيدير 4 تعديلات صغيرة فـ index.html (idempotent — إلا دارهم قبل ما كيعاودش):
#   1. __pvTabsPlus: كيزيد «Performance» فـ لائحة التبويبات
#   2. ag: أيقونة 📈
#   3. Gj: لون التبويب (violet)
#   4. الرندر: iframe لـ performance.html?embed=1
#
# التشغيل: python3 scripts/patch-performance-tab.py [--check]
# ─────────────────────────────────────────────────────────────────────────────
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / 'public_html' / 'index.html'

SRC = 'performance.html?embed=1&v=1'

EDITS = [
    (
        'if(!t.includes("Suivi des Retours"))t.push("Suivi des Retours");',
        'if(!t.includes("Suivi des Retours"))t.push("Suivi des Retours");'
        'if(!t.includes("Performance")){const __pi=t.indexOf("COMONDES");t.splice(__pi<0?t.length:__pi+1,0,"Performance")}',
        'if(!t.includes("Performance")){const __pi=t.indexOf("COMONDES");',
    ),
    (
        'ag={COMONDES:"📋",',
        'ag={COMONDES:"📋",Performance:"📈",',
        'Performance:"📈"',
    ),
    (
        'Gj={COMONDES:"blue",',
        'Gj={COMONDES:"blue",Performance:"violet",',
        'Performance:"violet"',
    ),
    (
        'w==="Suivi des Retours"&&s.jsx("iframe",',
        'w==="Performance"&&s.jsx("iframe",{src:"%s",title:"Performance",className:"w-full border-0",'
        'style:{display:"block",width:"100%%",height:"calc(100dvh - 172px)",minHeight:"620px",border:"0"}}),'
        'w==="Suivi des Retours"&&s.jsx("iframe",' % SRC,
        'w==="Performance"&&s.jsx("iframe"',
    ),
]


def main():
    check = '--check' in sys.argv
    html = FILE.read_text(encoding='utf-8')

    missing = [m for _, _, m in EDITS if m not in html]
    pending = [e for e in EDITS if e[2] not in html]
    srcs = [e for e in EDITS if e[2] in html]

    if check:
        ok = all(e[2] in html for e in EDITS)
        print(('✓' if ok else '✗') + ' تبويب Performance '
              + ('مضاف' if ok else 'ناقص (%d/%d)' % (len(srcs), len(EDITS))))
        return 0 if ok else 1

    old_push = 'if(!t.includes("Performance"))t.push("Performance");'
    if old_push in html:
        html = html.replace(old_push, '', 1)

    if not pending:
        print('✓ تبويب Performance مضاف من قبل — ما كاين ما ندير')
        return 0

    for old, new, marker in pending:
        if old not in html:
            print('✗ ما لقيتش: ' + old[:60])
            return 1
        html = html.replace(old, new, 1)

    FILE.write_text(html, encoding='utf-8')
    print('✓ تبويب Performance تزاد فـ index.html (%d تعديل)' % len(pending))
    return 0


if __name__ == '__main__':
    sys.exit(main())
