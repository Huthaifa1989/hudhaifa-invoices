# Hudhaifa Invoices Backend

خادم Node.js + Express يجمع الفواتير تلقائيًا من:
- **Gmail** (رسائل بريد إلكتروني)
- **Google Drive** (ملفات PDF / صور)
- **رفع يدوي** (Uploads)
- مع **Firestore** للتخزين المؤقت (Cache) وتخفيف استهلاك الكوتا من Gmail/Drive.

---

## 🚀 المميزات

- يجلب الفواتير ويصنفها حسب النوع:
  - Wolt
  - كهرباء
  - مياه
  - أرنونا
  - وقود (بنزين/ديزل) هذه الوحيدة من ملف في الدرايف https://drive.google.com/drive/folders/1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy?usp=drive_link هذا رابط الملف الي انا برفع عليه الفواتير 
  - أخرى
- يدعم **رفع ملفات يدوية** عبر `/api/upload`
- يستخدم **Firestore Cache** لتجنب ضرب الـ API كثيرًا (يحدث فقط عند الحاجة أو عند طلب `?refresh=1`)
- يدعم **Health Check** عبر `/health` و `/api/health`
- يعمل على **Cloud Run** مع إمكانية التوسع تلقائيًا

---

## 📂 البنية

project/
├── public/ # ملفات الواجهة الأمامية
├── uploads/ # ملفات مرفوعة يدويًا
├── server.js # الكود الرئيسي
├── env.yaml # متغيرات البيئة للنشر
└── package.json

---

## ⚙️ الإعداد

1. **تثبيت المكتبات**
   ```bash
   npm install
   npm install @google-cloud/firestore
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=your_redirect_uri
REFRESH_TOKEN=your_refresh_token
FUEL_FOLDER_ID=your_drive_folder_id
COOLDOWN_SEC=180
node server.js
http://localhost:8080/
# متغيرات أساسية
$project = "sample-firebase-ai-app-c6d3a"
$region  = "us-central1"
$svc     = "hudhaifa-invoices-backend"
$TAG     = "us-central1-docker.pkg.dev/$project/invoices-repo/hudhaifa-invoices:$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# بناء الصورة
gcloud builds submit --tag $TAG .

# نشر الخدمة
gcloud run deploy $svc `
  --image=$TAG `
  --platform=managed `
  --allow-unauthenticated `
  --region=$region `
  --timeout=600 `
  --memory=512Mi `
  --env-vars-file=env.yaml
🔗 الـ APIs

Health

GET /health

GET /api/health

كل الفواتير

GET /api/invoices/all

GET /api/invoices/all?refresh=1 ← يحدث البيانات ويعيد الكاش

مصنفة من Gmail

GET /api/invoices/categorized

حسب النوع

GET /api/invoices/wolt

GET /api/invoices/water

GET /api/invoices/electricity

GET /api/invoices/arnona

GET /api/invoices/fuel
رفع يدوي
POST /api/upload ← form-data مع مفتاح files[]

🛡️ إدارة الكوتا

السيرفر يقرأ دائمًا من Firestore.

عند إضافة ?refresh=1، يحدث Gmail/Drive إذا مرّ وقت كافٍ (COOLDOWN_SEC).

هذا يمنع استهلاك الكوتا بسرعة ويحافظ على استقرار الخدمة.

📌 ملاحظات

يجب أن تكون خدمة Cloud Run مربوطة بحساب خدمة (Service Account) لديه صلاحيات:

Gmail API

Google Drive API

Firestore

لتقليل الكوتا أكثر، يمكن إضافة Cloud Scheduler Job لتحديث الكاش كل 5–10 دقائق.

🧑‍💻 المؤلف

Hudhaifa — مشروع إدارة فواتير أوتوماتيكي عبر Google Workspace.
