# الخطوة الأولى لنشر مشروع Hudhaifa Invoices

## 1. تجهيز البيئة

- تأكد من تثبيت [Node.js](https://nodejs.org/) على جهازك.
- ثبت [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).
- أنشئ مشروع جديد على [Google Cloud Console](https://console.cloud.google.com/).
- فعّل خدمات Cloud Run و Cloud Build في المشروع.

## 2. إعداد متغيرات البيئة

- أنشئ ملف `.env` في مجلد `backend` وضع فيه القيم المطلوبة:
  ```
  CLIENT_ID=your-client-id
  CLIENT_SECRET=your-client-secret
  REDIRECT_URI=your-redirect-uri
  REFRESH_TOKEN=your-refresh-token
  ```

---

**تابع إلى الخطوة الثانية بعد التأكد من إتمام هذه