#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-dark-mode.py — كيدخل الوضع الليلي داخل index.html (self-contained)

كياخد:
  public_html/pv-dark.css   (مولّد بـ scripts/build-dark-css.py)
  public_html/pv-dark.js    (الكود ديال الزر)
وكيدخلهم فـ index.html بين markers، فباش:
  • ترفع غير index.html وتلقى كلشي خدام
  • تعاود تشغل السكريبت فكل مرة كيبدل اللوجيك بلا تكرار

الاستعمال:  python3 scripts/build-dark-mode.py [--check]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public_html')
INDEX = os.path.join(PUB, 'index.html')
CSS = os.path.join(PUB, 'pv-dark.css')
JS = os.path.join(PUB, 'pv-dark.js')

BEGIN = '<!--PV-DARK:BEGIN (مولّد بـ scripts/build-dark-mode.py — ما تعدلوش بيدك)-->'
END = '<!--PV-DARK:END-->'
BLOCK_RE = None

BOOT = """<script id="pv-dark-boot">(function(){try{var t=localStorage.getItem('pv_theme');if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-pv-theme',t);}catch(e){document.documentElement.setAttribute('data-pv-theme','light');}})();</script>"""


def outside_scripts(html):
    """كي marki كولشي داخل <script>...</script> باش ما نحقنوش وسط JS.
    (index.html فيه نصوص فيها '</head>' داخل bundle ديال SheetJS!)"""
    mask = [True] * len(html)
    pos = 0
    while True:
        a = html.find('<script', pos)
        if a == -1:
            break
        b = html.find('</script>', a)
        if b == -1:
            break
        b += len('</script>')
        for k in range(a, b):
            mask[k] = False
        pos = b
    return mask


def find_tag(html, tag, last=False):
    """أول/آخر occurrence ديال tag برا scripts، ولا None."""
    mask = outside_scripts(html)
    idxs = []
    pos = 0
    while True:
        i = html.find(tag, pos)
        if i == -1:
            break
        if mask[i]:
            idxs.append(i)
        pos = i + 1
    if not idxs:
        return None
    return idxs[-1] if last else idxs[0]


def build_block(css, js):
    return (
        BEGIN + '\n'
        + '<style id="pv-dark-css">\n' + css + '\n</style>\n'
        + '<script id="pv-dark-js">\n' + js + '\n</script>\n'
        + END
    )


def main():
    check_only = '--check' in sys.argv
    css = open(CSS, encoding='utf-8').read()
    js = open(JS, encoding='utf-8').read()
    html = open(INDEX, encoding='utf-8').read()
    block = build_block(css, js)

    # 1) شيل أي نسخة قديمة
    if BEGIN in html:
        i = html.index(BEGIN)
        j = html.index(END) + len(END)
        html = html[:i] + block + html[j:]
        action = 'updated'
    else:
        # 2) أول مرة: bootstrap فـ <head> + البلوك قبل </body>
        if '<script id="pv-dark-boot">' not in html:
            k = find_tag(html, '</head>')
            if k is None:
                sys.exit('✗ ما لقيتش </head> برا الـ scripts')
            html = html[:k] + BOOT + '\n' + html[k:]
        k = find_tag(html, '</body>', last=True)
        if k is None:
            sys.exit('✗ ما لقيتش </body> برا الـ scripts')
        html = html[:k] + block + '\n' + html[k:]
        action = 'installed'

    if check_only:
        cur = open(INDEX, encoding='utf-8').read()
        same = (cur == html)
        print(('✓ index.html up to date' if same else '✗ index.html OUTDATED — شغل السكريبت بلا --check'))
        return 0 if same else 1

    open(INDEX, 'w', encoding='utf-8').write(html)
    print(f'✓ dark mode {action} → {INDEX}  ({os.path.getsize(INDEX)} bytes)')
    print(f'  css {len(css)} bytes · js {len(js)} bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main())
