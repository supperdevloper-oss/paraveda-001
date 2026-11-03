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

## ملاحظات

- `git` كيتجاهل الداتا والسجلات (`crm_data.json`, `journal.log`, `audit.log`,
  `digylog_cfg.json`...) حيت كيتبدلو فكل ثانية وفيها معلومات الزبناء.
  النسخة الأصلية باقية فـ `_public_html.zip`.
- كنختارو `API_VERSION` تابت فـ `api.php` (`CRM_API_VERSION`) — بدّلو فبلاصة وحدة.
- `index.html` هو bundle minifié: التعديلات الكبيرة فالكود كتحتاج السورس الأصلي
  (React) — إلا بغيتي، قول لينا ونديرو إصلاحات مباشرة على الـ bundle الحالي.
