#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch-orders-pulse.py — كيزيد «نبض الطلبيات» (sparkline 30 يوم) حدا فيلتر الفترة.

    python3 scripts/patch-orders-pulse.py
    python3 scripts/patch-orders-pulse.py --check

idempotent — علامات /*PV-PULSE:BEGIN*/ … /*PV-PULSE:END*/ و PV-PULSE-HELPER.
"""
import sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "public_html", "index.html")

CSS_BEGIN, CSS_END = "/*PV-PULSE:BEGIN*/", "/*PV-PULSE:END*/"
HELP_BEGIN, HELP_END = "<!--PV-PULSE-HELPER:BEGIN-->", "<!--PV-PULSE-HELPER:END-->"
ANCHOR = 'className:"pv-period flex flex-wrap items-center gap-2"'

NEW_CSS = CSS_BEGIN + r"""
/* ===== نبض الطلبيات — sparkline 30 يوم ===== */
.pv-pulse{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:11px;height:36px;
 padding:0 13px;border-radius:11px;isolation:isolate;
 background:linear-gradient(102deg,#0a1120 0%,#101c33 55%,#0a1120 100%);
 box-shadow:inset 0 0 0 1px rgba(148,163,184,.22),inset 0 1px 0 rgba(255,255,255,.10),
  0 10px 22px -20px #020617}
.pv-pulse::before{content:"";position:absolute;inset:-10px;z-index:0;
 background-image:radial-gradient(rgba(148,163,184,.30) 1px,transparent 1px);
 background-size:12px 12px;opacity:.35;pointer-events:none;
 -webkit-mask-image:radial-gradient(closest-side,#000,transparent);
 mask-image:radial-gradient(closest-side,#000,transparent)}
.pv-pp-head{position:relative;z-index:1;display:flex;flex-direction:column;gap:3px;line-height:1;
 flex:0 0 auto}
.pv-pp-t{font-size:9.5px;font-weight:800;color:#cfdbee;white-space:nowrap;letter-spacing:.01em}
.pv-pp-s{font-size:8px;font-weight:700;color:#7f93ae;white-space:nowrap}
.pv-pp-chart{position:relative;z-index:1;width:152px;height:28px;flex:0 0 auto}
.pv-pp-chart svg{display:block;width:100%;height:100%;overflow:visible}
.pv-pp-line{fill:none;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 3px rgba(129,140,248,.55));
}
.pv-pp-line2{fill:none;stroke:#34d399;stroke-width:1.7;filter:drop-shadow(0 0 3px rgba(52,211,153,.5));stroke-linecap:round;stroke-linejoin:round;
 opacity:.95}

.pv-pp-dot{fill:#a5b4fc;r:2.4;animation:pvBlip 2.6s ease-in-out infinite}
@keyframes pvBlip{0%,100%{r:2.4;opacity:.9}50%{r:3.4;opacity:1}}
.pv-pp-guide{stroke:rgba(203,213,225,.45);stroke-width:.8;stroke-dasharray:2 2;opacity:0}
.pv-pp-side{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;
 gap:3px;line-height:1;flex:0 0 auto}
.pv-pp-big{font-size:14px;font-weight:800;color:#f2f6ff;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pv-pp-badge{direction:ltr;font-size:8px;font-weight:800;border-radius:5px;padding:2px 4px;white-space:nowrap}
.pv-pp-badge.up{color:#6ee7b7;background:rgba(16,185,129,.16);box-shadow:inset 0 0 0 1px rgba(52,211,153,.28)}
.pv-pp-badge.down{color:#fca5a5;background:rgba(239,68,68,.16);box-shadow:inset 0 0 0 1px rgba(248,113,113,.28)}
.pv-pp-badge.flat{color:#94a3b8;background:rgba(148,163,184,.14);box-shadow:inset 0 0 0 1px rgba(148,163,184,.22)}
/* tooltip */
.pv-pp-tip{position:fixed;z-index:2147483000;pointer-events:none;opacity:0;transform:translateY(4px);
 transition:opacity .12s ease,transform .12s ease;padding:6px 8px;border-radius:8px;
 background:rgba(6,12,24,.96);box-shadow:inset 0 0 0 1px rgba(148,163,184,.28),0 12px 24px -14px #000;
 font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:700;color:#e2e8f0;line-height:1.5;
 white-space:nowrap}
.pv-pp-tip.on{opacity:1;transform:translateY(0)}
.pv-pp-tip b{color:#a5b4fc;font-weight:800}
.pv-pp-tip i{font-style:normal;color:#6ee7b7}
@media (max-width:1420px){.pv-pp-chart{width:118px}}
@media (max-width:1240px){.pv-pulse{display:none}}
@media (prefers-reduced-motion:reduce){
 .pv-pp-dot{animation:none}}
""" + CSS_END

NEW_HELPER = HELP_BEGIN + """
<script id="pv-orders-pulse-helper">
/* نبض الطلبيات — sparkline 30 يوم من نفس داتا الطلبيات (localStorage) */
(function () {
  var KEY = 'paraveda_orders_v5', DAYS = 30, cache = null, cacheAt = 0, series = [];
  function iso(d) {
    var y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), a = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + a;
  }
  function readRows() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return []; }
    if (!raw) return [];
    var o;
    try { o = JSON.parse(raw); } catch (e) { return []; }
    var arr = Array.isArray(o) ? o : (o && o.d) || [];
    return (arr || []).filter(function (r) { return r && !r._del; });
  }
  function build() {
    var now = cache && Date.now() - cacheAt < 4000 ? cache : null;
    if (now) return now;
    var rows = readRows(), byDay = {}, byDayK = {}, i, r, k;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      k = String(r.dateCreation == null ? '' : r.dateCreation).slice(0, 10);
      if (!k) continue;
      byDay[k] = (byDay[k] || 0) + 1;
      if (String(r.statut == null ? '' : r.statut).trim() === 'Confirmé') byDayK[k] = (byDayK[k] || 0) + 1;
    }
    var today = new Date(), list = [], j, d;
    for (j = DAYS - 1; j >= 0; j--) {
      d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - j);
      k = iso(d);
      list.push({ d: k, c: byDay[k] || 0, k: byDayK[k] || 0 });
    }
    var cur = 0, prev = 0, pd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    for (j = 0; j < DAYS; j++) { cur += list[j].c; prev += byDay[iso(new Date(pd.getFullYear(), pd.getMonth(), pd.getDate() - j))] || 0; }
    cache = { series: list, cur: cur, prev: prev };
    cacheAt = Date.now();
    series = list;
    return cache;
  }
  function path(list, key, w, h, max) {
    var n = list.length, p = [], i, x, y;
    for (i = 0; i < n; i++) {
      x = n === 1 ? w / 2 : (i / (n - 1)) * w;
      y = h - (max ? (list[i][key] / max) * (h - 4) : 0) - 2;
      p.push((i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1));
    }
    return p.join(' ');
  }
  function html() {
    var o = build(), list = o.series, W = 152, H = 28, i, max = 1;
    for (i = 0; i < list.length; i++) if (list[i].c > max) max = list[i].c;
    var line = path(list, 'c', W, H, max), line2 = path(list, 'k', W, H, max);
    var area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
    var lastX = W, lastY = H - (list[list.length - 1].c / max) * (H - 4) - 2;
    var diff = o.prev ? Math.round((o.cur - o.prev) * 100 / o.prev) : (o.cur ? 100 : 0);
    var cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    var arrow = diff > 0 ? '\\u25B2' : diff < 0 ? '\\u25BC' : '\\u2014';
    return '<span class="pv-pp-head"><span class="pv-pp-t">\u0646\u0628\u0636 \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a</span>' +
      '<span class="pv-pp-s">\u0622\u062e\u0631 ' + DAYS + ' \u064a\u0648\u0645</span></span>' +
      '<span class="pv-pp-side"><span class="pv-pp-big">' + String(o.cur).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ') + '</span>' +
      '<span class="pv-pp-badge ' + cls + '">' + arrow + ' ' + Math.abs(diff) + '%</span></span>' +
      '<span class="pv-pp-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="pvppG" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#818cf8" stop-opacity=".60"/>' +
      '<stop offset="100%" stop-color="#6366f1" stop-opacity=".04"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#pvppG)"/>' +
      '<path class="pv-pp-line" d="' + line + '" stroke="#a5b4fc" stroke-width="1.6"/>' +
      '<path class="pv-pp-line2" d="' + line2 + '"/>' +
      '<line class="pv-pp-guide" x1="0" y1="0" x2="0" y2="' + H + '"/>' +
      '<circle class="pv-pp-dot" cx="' + lastX + '" cy="' + lastY.toFixed(1) + '"/></svg></span>';
  }
  window.__pvPulse = html;

  /* tooltip */
  var tip = null, chartEl = null;
  function ensureTip() {
    if (!tip) { tip = document.createElement('div'); tip.className = 'pv-pp-tip'; document.body.appendChild(tip); }
    return tip;
  }
  document.addEventListener('mousemove', function (ev) {
    var chart = ev.target && ev.target.closest ? ev.target.closest('.pv-pp-chart') : null;
    if (!chart) {
      if (tip) tip.classList.remove('on');
      document.querySelectorAll('.pv-pp-guide').forEach(function (g) { g.style.opacity = '0'; });
      chartEl = null; return;
    }
    chartEl = chart;
    var svg = chart.querySelector('svg');
    if (!svg || !series.length) return;
    var r = svg.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
    var idx = Math.round((x / r.width) * (series.length - 1));
    var pt = series[idx];
    var gx = (idx / (series.length - 1)) * 152;
    chart.querySelectorAll('.pv-pp-guide').forEach(function (g) {
      g.setAttribute('x1', gx); g.setAttribute('x2', gx); g.style.opacity = '1';
    });
    var t = ensureTip();
    var wd = ['\u0627\u0644\u0623\u062d\u062f', '\u0627\u0644\u0627\u062b\u0646\u064a\u0646', '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621', '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621', '\u0627\u0644\u062e\u0645\u064a\u0633', '\u0627\u0644\u062c\u0645\u0639\u0629', '\u0627\u0644\u0633\u0628\u062a'];
    var dd = pt.d.slice(8, 10) + '/' + pt.d.slice(5, 7);
    var day = new Date(pt.d + 'T00:00:00').getDay();
    t.innerHTML = wd[day] + ' ' + dd + '<br>\u0637\u0644\u0628\u064a\u0627\u062a <b>' + pt.c + '</b> \u00b7 \u0645\u0624\u0643\u062f <i>' + pt.k + '</i>';
    t.classList.add('on');
    var tw = t.offsetWidth, th = t.offsetHeight;
    t.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, ev.clientX - tw / 2)) + 'px';
    t.style.top = Math.max(8, r.top - th - 8) + 'px';
  }, true);

  /* تحديث دوري خفيف (إلا إذا تبدلت الداتا) */
  setInterval(function () {
    if (Date.now() - cacheAt < 9000) return;
    var fresh = html();
    document.querySelectorAll('.pv-pulse').forEach(function (el) {
      if (el.innerHTML !== fresh) el.innerHTML = fresh;
    });
  }, 12000);
})();
</script>
""" + HELP_END

NEW_CHILD = ('s.jsx("div",{className:"pv-pulse",'
             '"aria-label":"نبض الطلبيات",'
             'dangerouslySetInnerHTML:{__html:(window.__pvPulse?window.__pvPulse():"")}})')


def find_element_span(s, start):
    p = s.index('(', start)
    depth, i, quote = 0, p, None
    while i < len(s):
        ch = s[i]
        if quote:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in ('"', "'", '`'):
            quote = ch
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    raise RuntimeError('unbalanced')


def find_period_span(s):
    if ANCHOR not in s:
        return None
    idx = s.index(ANCHOR)
    start = s.rindex('s.jsxs', 0, idx)
    return find_element_span(s, start)


def find_block(s, begin, end):
    if begin in s and end in s:
        return s.index(begin), s.index(end) + len(end)
    return None


def main():
    check = "--check" in sys.argv
    src = io.open(FILE, encoding="utf-8").read()
    s = src

    span = find_period_span(s)
    if span is None:
        print("✗ ما لقيتش .pv-period")
        return 1

    body = s[span[0]:span[1]]
    if 'className:"pv-pulse"' in body:
        # بدّل العنصر القديم
        i = body.index('className:"pv-pulse"')
        estart = body.rindex('s.jsx', 0, i)
        eend = find_element_span(body, estart)[1]
        body = body[:estart] + NEW_CHILD + body[eend:]
    else:
        tail = body[-3:]
        if tail != ']})':
            print("✗ ما فهمتش نهاية .pv-period: %r" % tail)
            return 1
        body = body[:-3] + "," + NEW_CHILD + "]})"
    s = s[:span[0]] + body + s[span[1]:]

    blk = find_block(s, CSS_BEGIN, CSS_END)
    if blk is None:
        css = find_block(s, "/*PV-RIDE:BEGIN*/", "/*PV-RIDE:END*/")
        if css is None:
            print("✗ ما لقيتش بلوك CSS")
            return 1
        s = s[:css[1]] + "\n" + NEW_CSS + s[css[1]:]
    else:
        s = s[:blk[0]] + NEW_CSS + s[blk[1]:]

    hblk = find_block(s, HELP_BEGIN, HELP_END)
    if hblk is not None:
        s = s[:hblk[0]] + NEW_HELPER + s[hblk[1]:]
    else:
        head = s.rindex('</head>')
        s = s[:head] + NEW_HELPER + "\n" + s[head:]

    changed = s != src
    if check:
        if changed:
            print("✗ نبض الطلبيات ما مطبّقش (شغّل: python3 scripts/patch-orders-pulse.py)")
            return 1
        print("✓ نبض الطلبيات مطبّق فـ index.html")
        return 0
    if changed:
        io.open(FILE, "w", encoding="utf-8").write(s)
    print("✓ %s — نبض الطلبيات (%d bytes CSS)" % ("تحدّث" if changed else "مضبوط", len(NEW_CSS)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
