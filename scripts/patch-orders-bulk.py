#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-orders-bulk.py — تحسين شريط الإجراءات الجماعية (bulk) + ترتيب شريط التبويبات
+ توحيد حجم أزرار الـ toolbar فـ صفحة الطلبيات.

    python3 scripts/patch-orders-bulk.py
    python3 scripts/patch-orders-bulk.py --check

idempotent — علامات <!--PV-BULK:BEGIN--> … <!--PV-BULK:END--> قبل </head>.
الـ JS كيوسم العناصر الموجودة (ماشي كيعاود يبنيها): كيزيد class
  .pv-bulk    على شريط الإجراءات الجماعية
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

BEGIN, END = "<!--PV-BULK:BEGIN-->", "<!--PV-BULK:END-->"

BLOCK = BEGIN + r"""
<style id="pv-bulk-css">
/* ===== شريط الإجراءات الجماعية فـ الطلبيات ===== */
.pv-bulk{
 position:relative;
 gap:8px!important;
 padding:8px 12px!important;
 background:linear-gradient(180deg,#f2fdf6 0%,#ecfdf5 100%)!important;
 border-bottom:1px solid #a7f3d0!important;
 box-shadow:inset 0 1px 0 #fff!important}
.pv-bulk>b{
 display:inline-flex;align-items:center;gap:6px;
 padding:5px 11px;border-radius:999px;
 background:#059669;color:#fff!important;
 font-size:11px!important;font-weight:800!important;line-height:1.2;letter-spacing:.01em;
 box-shadow:0 5px 14px -7px rgba(5,150,105,.9)}
.pv-bulk button{
 height:30px!important;min-height:30px!important;padding:0 11px!important;
 border-radius:9px!important;border:1px solid #cbd5e1!important;
 background:#fff!important;color:#0f172a!important;
 font-size:11.5px!important;font-weight:700!important;line-height:1!important;
 box-shadow:none!important;white-space:nowrap!important;
 transition:background .14s ease,border-color .14s ease!important}
.pv-bulk button>span{white-space:nowrap!important}
.pv-bulk button>span:first-child{font-size:12px!important;line-height:1!important}
.pv-bulk button:hover{background:#f8fafc!important;border-color:#94a3b8!important}
.pv-bulk button:active{transform:scale(.975)!important}
/* الأدوار */
.pv-bulk button[class*="border-emerald-600"]{background:#059669!important;border-color:#047857!important;color:#fff!important}
.pv-bulk button[class*="border-emerald-600"]:hover{background:#047857!important}
.pv-bulk button[class*="border-slate-600"]{background:#f1f5f9!important;border-color:#cbd5e1!important;color:#334155!important}
.pv-bulk button[class*="border-slate-600"]:hover{background:#e2e8f0!important}
.pv-bulk button[class*="border-amber-500"]{background:#fffbeb!important;border-color:#fcd34d!important;color:#92400e!important}
.pv-bulk button[class*="border-amber-500"]:hover{background:#fef3c7!important}
.pv-bulk button[class*="border-red-600"]{background:#fef2f2!important;border-color:#fca5a5!important;color:#b91c1c!important}
.pv-bulk button[class*="border-red-600"]:hover{background:#fee2e2!important}
.pv-bulk select{
 height:30px!important;flex:0 0 142px!important;width:142px!important;max-width:none!important;
 direction:rtl;text-overflow:ellipsis;
 border-radius:9px!important;border:1px solid #cbd5e1!important;
 background:#fff!important;color:#334155!important;
 font-size:11px!important;font-weight:700!important;padding:0 8px!important}

/* ===== شريط التبويبات (pv-main-nav): سكرول ناضي + تصغير باش يدخلو كاملين ===== */
.pv-main-nav{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.45) transparent;
 scroll-behavior:smooth;overscroll-behavior-x:contain}
.pv-main-nav::-webkit-scrollbar{height:3px}
.pv-main-nav::-webkit-scrollbar-track{background:transparent}
.pv-main-nav::-webkit-scrollbar-thumb{background:rgba(148,163,184,.45);border-radius:99px}
/* يلا ما دخلاوش فسطر واحد: كيتلوّحو لسطرين بدل ما يتقطعو */
@media(max-width:1780px){
 .pv-main-nav{flex-wrap:wrap!important;overflow:visible!important;row-gap:6px!important}
 .pv-main-nav>div{padding-inline:9px!important;font-size:11.5px!important;gap:6px!important}}
@media(max-width:1520px){.pv-main-nav>div{padding-inline:7px!important;font-size:11px!important;gap:5px!important}}
@media(max-width:1320px){.pv-main-nav>div{padding-inline:6px!important;font-size:10.5px!important}}

/* ===== توحيد أزرار الـ toolbar ===== */
.pv-cmd-toolbar{padding:8px 12px!important;gap:8px!important}
.pv-cmd-toolbar>button,.pv-cmd-toolbar>div>button{height:30px!important;border-radius:9px!important;font-size:11.5px!important}

/* ===== الوضع الليلي ===== */
html[data-pv-theme="dark"] .pv-bulk{
 background:linear-gradient(180deg,#0d1c17 0%,#0a1712 100%)!important;
 border-bottom-color:rgba(16,185,129,.32)!important;box-shadow:none!important}
html[data-pv-theme="dark"] .pv-bulk>b{background:#10b981;color:#04211a!important;
 box-shadow:0 5px 14px -7px rgba(16,185,129,.85)}
html[data-pv-theme="dark"] .pv-bulk button{background:#111c26!important;color:#e2e8f0!important;border-color:#243244!important}
html[data-pv-theme="dark"] .pv-bulk button:hover{background:#182636!important;border-color:#33475d!important}
html[data-pv-theme="dark"] .pv-bulk button[class*="border-emerald-600"]{background:#059669!important;color:#fff!important;border-color:#059669!important}
html[data-pv-theme="dark"] .pv-bulk button[class*="border-slate-600"]{background:#1b2836!important;color:#cbd5e1!important;border-color:#2c3d50!important}
html[data-pv-theme="dark"] .pv-bulk button[class*="border-amber-500"]{background:rgba(245,158,11,.13)!important;color:#fcd34d!important;border-color:rgba(245,158,11,.34)!important}
html[data-pv-theme="dark"] .pv-bulk button[class*="border-red-600"]{background:rgba(239,68,68,.13)!important;color:#fca5a5!important;border-color:rgba(239,68,68,.4)!important}
html[data-pv-theme="dark"] .pv-bulk select{background:#111c26!important;color:#e2e8f0!important;border-color:#243244!important}

@media (prefers-reduced-motion:reduce){
 .pv-bulk button{transition:none!important}}
</style>
<script id="pv-bulk-js">
(function(){
 var q=[];
 function tag(){
  if(!document.querySelector('.pv-bulk')){
   var b=document.querySelectorAll('b');
   for(var i=0;i<b.length;i++){
    if(/محدد:/.test(b[i].textContent||'')){
     var p=b[i].parentElement;
     if(p){
      p.classList.add('pv-bulk');
      var sb=p.querySelector('select');
      if(sb&&sb.options.length&&sb.options[0].textContent.indexOf('تغيير')<0){
       sb.options[0].textContent='🚚 بدّل الحالة…';
      }
     }
     break;
    }
   }
  }
 }
 var pend=false;
 function onMut(){
  if(pend){return;}
  pend=true;
  (window.requestAnimationFrame||setTimeout)(function(){pend=false;tag();},1);
 }
 function boot(){
  tag();
  try{new MutationObserver(onMut).observe(document.body,{childList:true,subtree:true});}catch(e){}
  window.addEventListener('resize',onMut);
 }
 if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}else{boot();}
})();
</script>
""" + END


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src
    b = s.find(BEGIN)
    e = s.find(END)
    if b >= 0 and e > b:
        s = s[:b] + BLOCK + s[e + len(END):]
    else:
        head = s.rindex("</head>")
        s = s[:head] + BLOCK + "\n" + s[head:]
    changed = s != src
    if check:
        if changed:
            print("✗ bloc bulk ma mtabbeq (chughel: python3 scripts/patch-orders-bulk.py)")
            return 1
        print("✓ شريط الإجراءات الجماعية مطبّق")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — شريط الإجراءات الجماعية" % ("تحدّث" if changed else "مضبوط"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
