#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# Paraveda CRM — توسيط محتوى كروت KPI (الأرقام/العناوين وسط المربع)
#
# كيزيد بلوك CSS صغير فـ index.html (idempotent) بين markers:
#   /*PV-KPI-CENTER:BEGIN*/ … /*PV-KPI-CENTER:END*/
#
# • الأيقونة + النص كيتوسّطو كمجموعة، والسهم «›» كيبقى ف الحافة اليمنى.
# • الوصف (Clients sans réponse / Panier moyen …) والباج كيتوسّطو.
# • الهالة (glow) كتتوسّط فوق الكارت.
#
# التشغيل: python3 scripts/patch-kpi-center.py [--check]
# ─────────────────────────────────────────────────────────────────────────────
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / 'public_html' / 'index.html'

ANCHOR = '/* ===== كلاسات ناقصة من بناء Tailwind — مزيدة يدوياً ===== */'
BEGIN = '/*PV-KPI-CENTER:BEGIN*/'
END = '/*PV-KPI-CENTER:END*/'

CSS = BEGIN + """
/* توسيط محتوى كروت KPI — النص فـ وسط المربع، والأيقونة حدا الحافة */
.pvk{text-align:center}
.pvk-top{display:block;position:relative;text-align:center}
.pvk-ico{position:absolute;inset-inline-start:0;top:0}
.pvk-mid{display:block;min-width:0;padding-inline:34px;text-align:center}
.pvk-lab{white-space:normal;line-height:1.2}
.pvk-val,.pvk-desc{text-align:center}
.pvk-badge{margin-inline:auto}
.pvk-glow{left:50%;top:-34px;transform:translateX(-50%)}
.pvk-arw{position:absolute;inset-inline-end:0;top:0;transform:none;font-size:11px;opacity:.7}
.pvk:hover .pvk-arw{transform:none;opacity:1}
""" + END


def main():
    check = '--check' in sys.argv
    html = FILE.read_text(encoding='utf-8')

    if BEGIN in html and END in html:
        if check:
            print('✓ توسيط كروت KPI موجود')
            return 0
        import re
        html = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda m: CSS, html, flags=re.S)
        FILE.write_text(html, encoding='utf-8')
        print('✓ توسيط كروت KPI تحدّث')
        return 0

    if check:
        print('✗ توسيط كروت KPI ناقص')
        return 1

    if ANCHOR not in html:
        print('✗ ما لقيتش الـ anchor ديال CSS')
        return 1

    html = html.replace(ANCHOR, CSS + '\n\n' + ANCHOR, 1)
    FILE.write_text(html, encoding='utf-8')
    print('✓ توسيط كروت KPI تزاد')
    return 0


if __name__ == '__main__':
    sys.exit(main())
