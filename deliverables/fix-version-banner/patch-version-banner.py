#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-version-banner.py — كيصلح بانر «api.php ماشي بحال index.html» فأي نسخة index.html

الاستعمال:
    python3 patch-version-banner.py index.html
    python3 patch-version-banner.py index.html --server-version 3.94

شنو كيدير:
  1. كيثبّت EXPECTED على النسخة اللي كيرجع api.php (default: 3.94).
  2. كيزيد مقارنة نسخ ذكية (verNum/verCmp).
  3. كيبدل الشرط الصارم (apiVersion !== EXPECTED) بواحد متسامح:
     البانر كيبان غير إلا كان السيرفر **أقدم** من index.html.

الملف كيتعدل في بلاصتو (كيندار باكاب .bak أوتوماتيك). السكريبت idempotent:
إلا كان الملف مزيان من قبل، كيقول ليك وماغادي يبدل والو.
"""
import argparse
import os
import shutil
import sys

MARKER = "function verCmp(a,b)"

HELPERS = """const EXPECTED='__VER__';
  /* v3.94.1 — مقارنة النسخ ولات ذكية:
     البانر ما كيبانش غير إلا كان api.php على السيرفر أقدم من index.html
     (كاش قديم ولا الحزمة ما ترفعاش كاملة). إلا كان السيرفر نفس النسخة
     ولا أحدث → سكات تام بلا حتى تنبيه. */
  function verNum(v){var m=String(v==null?'':v).match(/\\d+/g)||[];return m.map(function(n){return parseInt(n,10)||0;});}
  function verCmp(a,b){var x=verNum(a),y=verNum(b),n=Math.max(x.length,y.length);for(var i=0;i<n;i++){var p=x[i]||0,q=y[i]||0;if(p!==q)return p<q?-1:1;}return 0;}
  let sending=false;
"""

OLD_CHECK = """      if(j.apiVersion!==EXPECTED){
        say('⚠️ api.php على السيرفر ('+j.apiVersion+') ماشي بحال index.html ('+EXPECTED+') — رفع الحزمة كاملة (الملفات 4 مع بعض) فـ racine الموقع، ومن بعد دوز Ctrl+F5 باش يمسح الكاش');
      }"""

NEW_CHECK = """      var srv=String(j.apiVersion==null?'':j.apiVersion).trim();
      var cmp=verCmp(srv,EXPECTED);
      if(cmp<0){
        say('⚠️ api.php على السيرفر ('+srv+') أقدم من index.html ('+EXPECTED+') — رفع الحزمة كاملة (الملفات 4 مع بعض) فـ racine الموقع، ومن بعد دوز Ctrl+F5 باش يمسح الكاش');
      }else if(cmp>0){
        if(window.console&&console.info)console.info('[paraveda] api.php '+srv+' >= index.html '+EXPECTED+' — ما كاين حتى مشكل');
      }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", help="مسار index.html")
    ap.add_argument("--server-version", default="3.94",
                    help="النسخة اللي كيرجعها api.php (CRM_API_VERSION) — default 3.94")
    ap.add_argument("--no-backup", action="store_true")
    a = ap.parse_args()

    path = a.file
    if not os.path.isfile(path):
        sys.exit("✗ الملف ما كاينش: " + path)

    src = open(path, encoding="utf-8").read()

    if MARKER in src:
        print("✓ الملف راهو مزيان من قبل (المقارنة الذكية كاينة) — ما بدلت والو.")
        return 0

    if "const EXPECTED=" not in src:
        sys.exit("✗ ما لقيتش EXPECTED فهاد الملف — واش هادا index.html ديال Paraveda؟")

    # 1) استبدال بلوك EXPECTED + زيادة الدوال
    i = src.index("const EXPECTED=")
    j = src.index("\n", i)
    k = src.find("let sending=false;", j)
    if k == -1:
        sys.exit("✗ ما لقيتش 'let sending=false;' — البنية تبدلت، وقفنا بلا ما نبدلو والو.")
    k = src.index("\n", k) + 1
    src = src[:i] + HELPERS.replace("__VER__", a.server_version) + src[k:]

    # 2) استبدال المقارنة الصارمة
    if OLD_CHECK in src:
        src = src.replace(OLD_CHECK, NEW_CHECK, 1)
    else:
        # fallback: أي شرط قديم فيه !== EXPECTED
        old = "if(j.apiVersion!==EXPECTED){"
        if old not in src:
            sys.exit("✗ ما لقيتش شرط المقارنة — الملف ديال نسخة أخرى، وقفنا بلا ما نبدلو والو.")
        start = src.index(old)
        end = src.index("\n      }", start) + len("\n      }")
        src = src[:start] + NEW_CHECK.lstrip() + src[end:]

    if not a.no_backup:
        shutil.copyfile(path, path + ".bak")
    open(path, "w", encoding="utf-8").write(src)
    print("✓ تصلح:", path)
    print("   • EXPECTED = " + a.server_version)
    print("   • المقارنة ولات: بانر غير إلا السيرفر أقدم")
    if not a.no_backup:
        print("   • باكاب:", path + ".bak")
    return 0


if __name__ == "__main__":
    sys.exit(main())
