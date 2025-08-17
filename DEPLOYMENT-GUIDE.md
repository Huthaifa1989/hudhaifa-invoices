# دليل نشر مشروع Hudhaifa Invoices

## المتطلبات الأساسية
- حساب Google Cloud
- تثبيت Google Cloud SDK
- إعداد مشروع على Google Cloud
- تفعيل Cloud Run و Cloud Build

## خطوات النشر

1. **بناء صورة Docker:**
   ```powershell
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/hudhaifa-invoices-backend
   ```

2. **نشر على Cloud Run:**
   ```powershell
   gcloud run deploy hudhaifa-invoices-backend `
     --image gcr.io/[PROJECT_ID]/hudhaifa-invoices-backend `
     --platform managed `
     --region us-central1 `
     --allow-unauthenticated `
     --timeout=900s `
     --set-env-vars "CLIENT_ID=...,CLIENT_SECRET=...,REDIRECT_URI=...,REFRESH_TOKEN=..."
   ```

3. **تحديث متغيرات البيئة:**
   - تأكد من وجود ملف `.env` في مجلد `backend` أو تمرير القيم عبر `--set-env-vars`.

4. **التحقق من الخدمة:**
   - افتح رابط الخدمة على Cloud Run وتأكد من عمل جميع الصفحات والوظائف.

---

**ملاحظة:**  
يمكنك تعديل الخطوات حسب احتياجاتك أو إضافة