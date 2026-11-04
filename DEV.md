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

## شريط الحالة فـ الطلبيات (مسار الطلبيات — أرقام حقيقية)

بدّلنا «شريط الشارع» القديم (`pv-street.jpg` + `pv-rider.png` + `pv-client.png` +
أنيميشن المشاة) بشريط احترافي **بلا حتى صورة**، وكيبين **أرقام حقيقية**:

```
python3 scripts/patch-ride-strip.py          # idempotent (علامات /*PV-RIDE:BEGIN*/ + PV-RIDE-HELPER)
python3 scripts/patch-ride-strip.py --check  # واش مطبّق
```

- **عدّاد المجموع** (طلبية معروضة + نبضة خضراء حيّة) ثم **4 محطات** من اليمين لليسار:
  اتصال · تأكيد · إرسال · توصيل — SVG داخل chip زجاجي بلون خاص لكل محطة،
  **حلقة conic ring** حوالين كل أيقونة = نسبة المحطة من المعروض (`style="--p:NN%"`)،
  رقم كبير بتدرّج ضوئي + نسبة صغيرة حداها؛ مسار متقطّع كيتحرك، شبكة نقطية،
  شعاع ضوئي كل 7 ثوان، وخيط ضوئي فوق.
- النسب كتختفي تحت 1320px · عدّاد المجموع تحت 1240px · الشريط كامل تحت 1000px.
- **الأرقام** كتجي من `window.__pvRideStrip(q)` (script صغير قبل الـ bundle) — `q` هي
  الطلبيات المفلترة اللي فـ الجدول، بنفس تعريفات الـ CRM:
  اتصال = `(statut===""||/^Appel/i) && livraison===""` · تأكيد = `statut==="Confirmé"` ·
  إرسال = `livraison==="Expédier vers"` · توصيل = `livraison ∈ {Livrée,Rechange}`.
  → كتبدل مع الفترة/البحث/الفلاتر، ودائماً كتطابق «عرض N–M من T».
- كل الأنيميشن على `transform`/`opacity`/`background-position`؛ `prefers-reduced-motion`
  كيوقّف كلشي؛ كيتخبى تحت 1000px. ما كاين حتى تغيير فـ الداتا ولا فـ api.php.

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
