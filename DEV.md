# Paraveda CRM — دليل التطوير / المعاينة

المشروع كان مرفوع فـ git كـ `_public_html.zip` فقط. دابا تحلّ وولّى قابل للتعديل ملف بملف.

```
public_html/          ← الموقع كامل (هو اللي كيترفع للسيرفر)
  api.php             ← الـ backend (data store JSON + auth token + Digylog)
  index.html          ← التطبيق كامل (React + Vite bundle داخل <script type="module">)
  digylog-admin.html  ← صفحة إعدادات Digylog
  retours.html / quick.html / recover.php / import.php ...
  .htaccess           ← الحماية + الضغط + الكاش (فالإنتاج)
scripts/
  dev-server.sh       ← تشغيل معاينة محلية
  router.php          ← كيمثل قواعد .htaccess فـ PHP built-in server
```

## تشغيل المعاينة

```bash
./scripts/dev-server.sh            # http://localhost:8080
PORT=9000 ./scripts/dev-server.sh
```

السيرفر كيستعمل PHP 8.3 static (كينحمّل راسو أوتوماتيك أول مرة) وكيخدم على
`0.0.0.0` باش تبان المعاينة من المتصفح.

**حساب الأدمين (من `crm_data.json`):** `admin@paraveda.ma` / `rOYtKv0cd9UW`

## كيفاش التطبيق كيخدم (مهم قبل أي تعديل)

- الداتا كلها **keyed document store** فـ `crm_data.json`:
  `{ "paraveda_orders_v5": { "t": <timestamp>, "d": <payload> }, ... }`
- `GET api.php` (بـ header `X-Sync-Token`) كيرجع snapshot كامل (~2.6MB) + `ETag` (304 إلا ما تبدل والو).
- `POST api.php {key,t,d}` كيكتب doc واحد. الـ token موجود فـ `api.php` (السطر ~49) وفـ `index.html` (المتغير `Rd`).
- المتصفح كيخدم من `localStorage`، والـ sync كيمشي للسيرفر فكل تعديل.
- الـ token ماشي سر: هو ثابت فالجوج ملفات — أي حد عندو `index.html` عندو الـ token.

## الإصلاحات اللي تدارو فهاد الإعداد

1. **`index.html` كان كيعيّط نسخة 3.93 والسيرفر 3.94** → كان كيطلع تنبيه
   «api.php ماشي بحال index.html» فوق الشاشة. تصلّح: `EXPECTED='3.94'`.
2. **رسالة Digylog كل 6 ثواني فالمعاينة** (`TLS connect error` حيت الشبكة مسدودة)
   → تزاد flag ديال الديف فقط: إلا كان `public_html/.dev-nosend`، المرسلات
   الأوتوماتيكية (`crm_dl_send_guarded`, `crm_delivery_auto_guarded`,
   `crm_tracking_auto_guarded`) كترجع سكات بلا شبكة. **فالإنتاج الملف ما كاينش
   → السلوك ما تبدلش.**
3. `action:'ping'` كان كيرجع `3.83` ثابتة → ولى كيرجع `CRM_API_VERSION`.

## ملف جاهز للرفع (المشكل رقم 1)

`deliverables/fix-version-banner/` فيه `index.html` معدّل جاهز للرفع + `LIRE-MOI.txt`
+ `patch-version-banner.py` (كيصلح أي نسخة أخرى من index.html، idempotent).
النسخة اللي كترفع كتطابق بايت ببايت `public_html/index.html`
(SHA256: `4f91ac2d4b00eea2eda126a9cc7d7e3dc5b7584bb18d62709502a2a5e63416a3`).

## الوضع الليلي (Dark Mode) — v2

زر فـ أعلى اليمين حدى «تسجيل الخروج» (36×36، نفس القياس) كيبدل بين نهاري/ليلي.

**الملفات:**
- `public_html/pv-dark.css` — القواعد (مولّدة) · `public_html/pv-dark.js` — الزر والمنطق
- داخل `index.html` بين `<!--PV-DARK:BEGIN-->` و`<!--PV-DARK:END-->` (self-contained:
  ترفع غير index.html وتخدم)

**إعادة البناء بعد أي تعديل:**
```bash
python3 scripts/build-dark-css.py    # كيولّد pv-dark.css من ألوان الـ bundle
python3 scripts/build-dark-mode.py   # كيدخلهم فـ index.html (idempotent)
python3 scripts/build-dark-mode.py --check   # واش index.html محدّث
```

**كيفاش كيخدم:**
- `data-pv-theme` على `<html>` + اختيار محفوظ فـ `localStorage.pv_theme`
- سكريبت صغير فـ `<head>` (`pv-dark-boot`) كيطبق الوضع **قبل الرسم** = بلا وميض
- `Alt+D` = تبديل · `window.PVTheme.get/set/toggle/reset()`
- الزر كيعاود يركّب راسو إلا حيدو re-render ديال React (MutationObserver)
- الصفحات بلا هيدر (login) → الزر كيولي طاير فـ أقصى اليمين

**التغطية:** 241 utility مغطاة + ألوان inline (جداول COMONDES) + كلاسات
بقيمة حرة (`bg-[#f1c232]`) + متغيرات كروت KPI (`--pvk-bg`) + gradients فاتحة.
الألوان الصلبة والأزرار الملونة كتبقى بحالها (ما كتخسرش معنى الحالة).

**قواعد v2 (مهمة):**
- ألوان الحالة فـ الجداول (`#34c759` Livrée، `#ff2b2b` Retour، `#f6b26b` Expédié،
  `#ffff00` Rappel…) كتولي **tint صلب غامق** بنفس الصبغة + شريط 3px على حافة السطر
  (`box-shadow: inset 3px 0 0 accent`) — ماشي شفافية فوق خلفية كحلة.
- ألوان ماشي من باليت Tailwind كتتحول بـ HSL (`recolor()`): نفس hue، L≈17%.
- `transition:none` على `table/tr/td/th` فـ الوضع الليلي: الجدول كيـre-render
  كل ثانية وtransition كان كيعاود يبدا من الأول → اللون الغامق ما كانش كيبان.
- inputs داخل `td` كتولي شفافة باش لون الحالة يبان (بحال light mode).

**الصفحات المستقلة** (retours.html, quick.html, digylog-*) — كتتحمل داخل iframe
وكتبنى بـ CSS خاص بها. `scripts/build-dark-pages.py` كيحلل CSS ديالها وكيولّد
`pv-dark-pages.css` (نفس تحويل HSL) وكيدز boot + sync فـ كل صفحة بين
`<!--PV-DARK-PAGES:BEGIN-->` و`<!--PV-DARK-PAGES:END-->`.
```bash
python3 scripts/build-dark-pages.py           # يولد + يدخل
python3 scripts/build-dark-pages.py --check   # واش محدّث
```
الـ iframe كيتبع اختيار التطبيق عبر `localStorage.pv_theme` + حدث `storage`.

التباين كامل داز WCAG AA (4.59–16.7:1).

## شريط الحالة فـ الطلبيات (NEON GAUGES — أرقام حقيقية)

بدّلنا «شريط الشارع» القديم (صور + أنيميشن مشاة) بـ**4 عدّادات دائرية** + مجموع:

```
python3 scripts/patch-ride-strip.py          # idempotent (/*PV-RIDE:BEGIN*/ + PV-RIDE-HELPER)
python3 scripts/patch-ride-strip.py --check
```

- ⭕ عدّاد المجموع (تدرّج emerald→lime→gold) + «طلبية معروضة»
- ⭕ 4 حلقات: **اتصال · تأكيد · إرسال · توصيل** — القوس = النسبة من المعروض
  (`conic-gradient` على `--p`)، ونقطة بيضاء متوهجة فـ آخر القوس
  (`transform:rotate(calc(var(--p)*3.6deg)) translateY(-16px)`)
- ▫️ مسار متقطّع + **حزم ضوئية كتدوز** (`.pv-seg::before/::after`)
- ✨ نبضة توهّج متأخرة لكل حلقة + شعاع ضوئي كيمشي على الشريط
- الأرقام من `window.__pvRideStrip(q)` — نفس تعريفات الـ CRM (اتصال/تأكيد/إرسال/توصيل)
- `prefers-reduced-motion` كيوقّف الحركة · النسب < 1320px · المجموع < 1240px · الشريط < 1000px

## «نبض الطلبيات» — sparkline فـ فيلتر الفترة

```
python3 scripts/patch-orders-pulse.py          # idempotent (علامات /*PV-PULSE:BEGIN*/ + PV-PULSE-HELPER)
python3 scripts/patch-orders-pulse.py --check
```

شريحة زجاجية غامقة كتزاد فـ آخر `.pv-period` (حدا الأزرار: اليوم · أمس · … · Custom):

- عنوان «نبض الطلبيات — آخر 30 يوم» + مجموع 30 يوم + شارة اتجاه (▲/▼ ٪ مقابل الـ30 يوم السابقة)
- sparkline SVG: خط indigo = طلبيات كل نهار، خط emerald = المؤكدة فـ نفس النهار
- hover: خط إرشاد + tooltip (اليوم · التاريخ · طلبيات · مؤكد)
- الداتا من `localStorage.paraveda_orders_v5` (بلا `_del`)، `statut === "Confirmé"` = مؤكد،
  وتحديث ذاتي كل 12 ثانية إلا تبدلت → **بلا أي طلب للسيرفر** وبلا تعديل فـ الداتا
- `.pv-pp-line/.pv-pp-line2` **بلا أنيميشن** (React كيعاود الـ innerHTML فـ كل render وكيقطع
  أي `stroke-dashoffset` animation) — الأنيميشن باقي غير فـ `.pv-pp-dot` (نبضة) و`prefers-reduced-motion`
- كتختفي تحت 1240px · الرسم كيصغر تحت 1420px

## هوية «AI Commerce» — favicon + شاشة الإقلاع

```
python3 scripts/patch-brand-splash.py          # idempotent (علامات /*PV-BRAND:BEGIN*/ + PV-BRAND-SPLASH)
python3 scripts/patch-brand-splash.py --check
```

- العلامة: **ORBIT CUBE** — مكعب isométrique (e-commerce) داخل **مدار ذهبي** (orbit) فيه قمر صغير
  = «التجارة فـ مدار الذكاء». النسخ البديلة (bag / p / cube / violet) فـ `deliverables/brand-ai/concepts/`.
- **اللوحة المعتمدة: GREEN · GOLD** — tile `#053f31 → #0d9464 → #34d399` + bezel ذهبي
  `#fde68a → #fbbf24 → #d97706` + المدار/القمر `#fde68a`.
- **الهيدر**: `patch-header-brand.py` كيحط العلامة 26×26 فـ الشيپ ديال المستخدم (بلاصة الحرف)،
  وكيخلّي صورة المستخدم إلا كانت. ⚠️ ما تستعملش قيم Tailwind اعتباطية (`h-[26px]`) — ماشي فـ البيلد،
  حط القياسات فـ CSS ديالنا.
- favicon مدمج (data URI SVG) — بلا ملف خارجي.
- splash: حلقة conic كتدور + نقط كتضوي بالتتابع + شريط تقدّم، كتطفي بوحدها بعد ~1.5s
  وكتّحيد من الـ DOM (safety timer 6s)، و`prefers-reduced-motion` كيوقّف كلشي.
- الملفات: `deliverables/brand-ai/` (SVG + PNG 512/180 + lockups + previews).
- ⚠️ ملاحظة: `<body` كيتكرر داخل سترينغ ديال SheetJS — باش تزيد شي حاجة فـ الـ body
  استعمل `s.index("<body", s.rindex("</head>"))`.

## تحياد سطر «الأرقام محسوبة على» (فراغ KPI)

```
python3 scripts/patch-remove-kpi-scope.py          # idempotent
python3 scripts/patch-remove-kpi-scope.py --check
```

- العنصر `.pvk-scope` (النقطة + «الأرقام محسوبة على: <الفترة>» + شيپ «مفلتر: …») تحيّد **من الـ JSX**
  (`s.jsxs("div",{className:"pvk-scope",…})` + الفاصلة ديالو) — ماشي غير `display:none`.
- `.pvk-bar{padding-top:0}` → بطاقات KPI طلعو للفوق واستغلو الفراغ (~20px).
- ملاحظة: شيپ «مفلتر: …» كان داخل نفس العنصر، حيّدناه معاه — البطاقة المفلترة كتبقى
  مضوّية (`is-on`) وكليك عليها كيلغي الفلتر.

## بطاقات KPI — «AI CONSOLE» (شريط متواصل، بلا مربعات)

```
python3 scripts/patch-kpi-cards.py            # idempotent
python3 scripts/patch-kpi-cards.py --check
```

- البلاگ `/*PV-KPICARDS:BEGIN*/ … /*PV-KPICARDS:END*/` كيتزاد قبل `</head>`.
- **بلا كروت**: `.pvk` بلا خلفية/بورد/radius/ظل. الشريط `.pvk-bar` هو اللي عندو الخلفية،
  والفصل بخطوط `border-inline-start:1px solid var(--k-line)`.
- متغيرات الثيم على `.pvk-bar`: `--k-line · --k-ink · --k-mut · --k-dim`
  (`html[data-pv-theme="dark"] .pvk-bar` → `#080e13` + خطوط `rgba(255,255,255,.072)`).
- التخطيط: `.pvk-top` = flex (أيقونة 16px خطية بلون المحور + ليبل) · الرقم 26px/700 tabular-nums ·
  الوصف 10px بـ `margin-inline-start:26px` (محاذي للليبل).
- حالات: hover = خلفية 2.6% (بلا حركة) · `is-on` = تينت 6% + ليبل بلون المحور + بار 2px فالحد الأيسر
  (`.pvk.is-on::before`). **ماشي** خط سفلي — كان كيبان مقطوع فمقاس اللوحة.
- ريسبونسيف: +1280 6 أعمدة · 640–1279 3 أعمدة (min-height 80) · -640 عمودين (رقم 21px، ليبل كيتلوّح).
- ⚠️ الدرس (تكرّر مرّتين): الـ dark mode كيتحقن **فوق** البلاگ ديالنا (`pv-dark.js` كيزيد stylesheet
  فالوقت)، فالـ selector العادي كيخسر. الحل: زيد `.pvk-bar` فالسلسلة →
  `html[data-pv-theme="dark"] .pvk-bar .pvk-lab{…}`. نفس الشي لـ `--pvk-bg`: ما تستعملوهاش للخلفية.
- كاين ترتيب مهم: قواعد الموبايل لازم تكون **فآخر** البلاگ، وإلا `.pvk-val{26px}` اللي من بعد كيلغيها.

## صفحة Performance

تبويب جديد فـ الـ SPA كيتحمّل `performance.html` داخل iframe (بحال Suivi des Retours):

```bash
python3 scripts/patch-performance-tab.py          # كيزيد التبويب (idempotent)
python3 scripts/patch-performance-tab.py --check  # واش مضاف
python3 scripts/build-dark-pages.py               # كيدخل الوضع الليلي للصفحة
```

**الملف:** `public_html/performance.html` (self-contained: HTML + CSS + JS، بلا أي مكتبة خارجية).

**المصدر:** `GET api.php` (header `X-Sync-Token`) → `paraveda_orders_v5` + `paraveda_villes_v2`
(فrais livraison) + `paraveda_adspend_v1`. الحساب كامل client-side.

**الحسابات (مطابقة 1:1 لكود الـ CRM فـ `index.html`):**

القاعدة الذهبية: **الطلبيات المحذوفة (`_del`) ما كتدخلش فحتى حساب** (بحال
`a.filter(o=>!o._del)` فـ الـ SPA). الداتا الخام فيها 349 صف محذوف — كانو كيزيدو
العدد وبنقصو نسب التحويل.

| مؤشر | القاعدة (نفس السطر فـ index.html) |
|---|---|
| مؤكدة | `String(statut ?? "").trim() === "Confirmé"` |
| ملغاة | `"Annulé"` |
| Ventes | `Σ (Number(prix) \|\| 0)` ديال المؤكدة — **بلا × qte** |
| Panier moyen | Ventes ÷ عدد المؤكدة |
| Taux de conversion | المؤكدة ÷ جميع الطلبيات ديال الفترة × 100 |
| À contacter | `(statut === "" \|\| /^Appel/i.test(statut)) && livraison === ""` |
| Suivi nécessaire | `statut ∈ {Rappel, Suivé, Whatssap}` |
| Prêt pour expédition | `statut === "Confirmé" && livraison === ""` |
| Risque d'annulation | à contacter + `Date.now() - Date.parse(dateCreation) > 24h` |
| Livrées | `livraison ∈ {Livrée, Rechange}` (`__pvSold`) |
| Retours | `livraison ∈ {Retour, Remboursé}` (`__pvBack`) |
| En transit | `Expédier vers` |
| Taux livraison | Livrées ÷ Confirmées · Taux retour = Retours ÷ (Livrées + Retours) |
| Marge estimée | Ventes livrées − frais (`villes[nom].prix`) − `commission` |

**الفترات** بحال الـ CRM (`I4`): اليوم · أمس · هذا الأسبوع (من الاثنين) · هذا الشهر ·
30 يوم (زيادة) · الكل · مخصص.

**Contrôle de cohérence:** الصفحة كتعاود تحسب 9 مؤشرات بمحرك ثاني (portage حرفي
ديال الكود الميني ديال الـ CRM: `isC`, `sum`, `__pvKPI`) وتقارنهم — كيبانو
«✓ 9/9 identiques au CRM». تحقق آلي: اليوم/أمس/الأسبوع/الشهر/الكل = نفس أرقام
لوحة الـ CRM بالضبط (8/0/0/0، 19/0/1/11، 20/0/1/12، 178/0/1/170 …).

**الأقسام:** KPIs عامة · مقارنة 3 فترات · بطاقات البنات (Livrée/Retour/Expédié/Confirmé +
محاولات + عمولة) · جدول مقارنة · رسوم (نشاط، CA، تأكيدات، مرتجعات — SVG بلا مكتبة) ·
المنتجات · Produit × Agente · المدن · المصادر + مصاريف الإعلانات · Tunnel · محاولات الاتصال.

## ملاحظات

- `git` كيتجاهل الداتا والسجلات (`crm_data.json`, `journal.log`, `audit.log`,
  `digylog_cfg.json`...) حيت كيتبدلو فكل ثانية وفيها معلومات الزبناء.
  النسخة الأصلية باقية فـ `_public_html.zip`.
- كنختارو `API_VERSION` تابت فـ `api.php` (`CRM_API_VERSION`) — بدّلو فبلاصة وحدة.
- `index.html` هو bundle minifié: التعديلات الكبيرة فالكود كتحتاج السورس الأصلي
  (React) — إلا بغيتي، قول لينا ونديرو إصلاحات مباشرة على الـ bundle الحالي.
