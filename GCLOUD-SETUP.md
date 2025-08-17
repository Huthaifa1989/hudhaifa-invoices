# إعداد Google Cloud لمشروع Hudhaifa Invoices

## 1. إنشاء مشروع جديد
- ادخل إلى [Google Cloud Console](https://console.cloud.google.com/).
- أنشئ مشروع جديد باسم مناسب.

## 2. تفعيل الخدمات المطلوبة
- فعّل Cloud Run و Cloud Build من قائمة APIs & Services.

## 3. إعداد OAuth 2.0
- ادخل إلى APIs & Services > Credentials.
- أنشئ بيانات اعتماد OAuth Client ID.
- احفظ CLIENT_ID و CLIENT_SECRET و REDIRECT_URI و REFRESH_TOKEN في ملف البيئة `.env`.

## 4. تثبيت Google Cloud SDK
- اتبع تعليمات [التثبيت الرسمية](https://cloud.google.com/sdk/docs/install).

## 5. تسجيل الدخول عبر SDK
```powershell
gcloud auth login
gcloud config set project [PROJECT_ID]
```

## 6. إعداد النشر
- استخدم أوامر النشر في ملفات السكربت (`deploy.ps1` أو `deploy-simple.bat`).

---

**ملاحظة:**  
راجع إعدادات IAM & Admin لإعطاء الصلاحيات