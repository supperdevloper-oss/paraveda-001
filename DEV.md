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

## الوضع الليلي (Dark Mode) — v1

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

**التغطية:** 241 utility مغطاة + ألوان inline (جداول COMONDES) + gradients فاتحة.
الألوان الصلبة والأزرار الملونة كتبقى بحالها (ما كتخسرش معنى الحالة).
التباين كامل داز WCAG AA (4.59–16.7:1).

## ملاحظات

- `git` كيتجاهل الداتا والسجلات (`crm_data.json`, `journal.log`, `audit.log`,
  `digylog_cfg.json`...) حيت كيتبدلو فكل ثانية وفيها معلومات الزبناء.
  النسخة الأصلية باقية فـ `_public_html.zip`.
- كنختارو `API_VERSION` تابت فـ `api.php` (`CRM_API_VERSION`) — بدّلو فبلاصة وحدة.
- `index.html` هو bundle minifié: التعديلات الكبيرة فالكود كتحتاج السورس الأصلي
  (React) — إلا بغيتي، قول لينا ونديرو إصلاحات مباشرة على الـ bundle الحالي.
