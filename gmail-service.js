const { google } = require('googleapis');
const admin = require('firebase-admin');
const cron = require('node-cron');
const moment = require('moment');
const pdfParse = require('pdf-parse');
require('dotenv').config();

// إعداد Firebase Admin
const serviceAccount = require('../backend/config/firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// إعداد Gmail API
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// دالة تصنيف الفواتير
function classifyInvoice(fileName, senderEmail = '', subject = '') {
  const fileName_lower = fileName.toLowerCase();
  const senderEmail_lower = senderEmail.toLowerCase();
  const subject_lower = subject.toLowerCase();
  
  // تصنيف وولت
  if (senderEmail_lower.includes('wolt') || fileName_lower.includes('wolt') || 
      subject_lower.includes('wolt')) {
    return { category: 'فواتير وولت', source: 'Wolt', isKnownSource: true };
  }
  
  // تصنيف البنزين
  if (fileName_lower.includes('بنزين') || fileName_lower.includes('وقود') || 
      fileName_lower.includes('petrol') || fileName_lower.includes('fuel') ||
      senderEmail_lower.includes('petrol') || senderEmail_lower.includes('fuel')) {
    return { category: 'فواتير بنزين', source: 'محطة وقود', isKnownSource: true };
  }
  
  // تصنيف تأمين الدراجة
  if ((fileName_lower.includes('تأمين') || fileName_lower.includes('insurance')) && 
      (fileName_lower.includes('دراجة') || fileName_lower.includes('bike') || fileName_lower.includes('motorcycle'))) {
    return { category: 'تأمين الدراجة', source: 'شركة التأمين', isKnownSource: true };
  }
  
  // تصنيف تصليح الدراجة
  if ((fileName_lower.includes('تصليح') || fileName_lower.includes('repair')) && 
      (fileName_lower.includes('دراجة') || fileName_lower.includes('bike') || fileName_lower.includes('motorcycle'))) {
    return { category: 'تصليح الدراجة', source: 'ورشة تصليح', isKnownSource: true };
  }
  
  // تصنيف ترخيص الدراجة
  if ((fileName_lower.includes('ترخيص') || fileName_lower.includes('license')) && 
      (fileName_lower.includes('دراجة') || fileName_lower.includes('bike') || fileName_lower.includes('motorcycle'))) {
    return { category: 'ترخيص الدراجة', source: 'دائرة المرور', isKnownSource: true };
  }
  
  // البحث عن أسماء الشركات المعروفة
  const companies = [
    { name: 'Orange', ar: 'أورانج' },
    { name: 'Zain', ar: 'زين' },
    { name: 'Umniah', ar: 'أمنية' },
    { name: 'JEDCO', ar: 'شركة الكهرباء' },
    { name: 'WAJ', ar: 'مياه الأردن' },
    { name: 'Carrefour', ar: 'كارفور' },
    { name: 'Cozmo', ar: 'كوزمو' },
    { name: 'Safeway', ar: 'سيفوي' }
  ];
  
  for (let company of companies) {
    if (senderEmail_lower.includes(company.name.toLowerCase()) || 
        fileName_lower.includes(company.name.toLowerCase()) ||
        subject_lower.includes(company.name.toLowerCase()) ||
        fileName_lower.includes(company.ar) ||
        subject_lower.includes(company.ar)) {
      return { category: `فواتير ${company.ar}`, source: company.ar, isKnownSource: true };
    }
  }
  
  // إذا لم يتم التعرف على المصدر
  return { category: 'فواتير متفرقة', source: 'غير معروف', isKnownSource: false };
}

// دالة رفع الملف إلى Firebase Storage
async function uploadFileToStorage(fileBuffer, fileName, category) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
  const filePath = `invoices/${category}/${timestamp}_${sanitizedFileName}`;
  
  const file = bucket.file(filePath);
  const stream = file.createWriteStream({
    metadata: {
      contentType: 'application/octet-stream',
    }
  });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', async () => {
      try {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        resolve(publicUrl);
      } catch (error) {
        reject(error);
      }
    });
    stream.end(fileBuffer);
  });
}

// دالة استخراج النص من PDF
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('خطأ في استخراج النص من PDF:', error);
    return '';
  }
}

// دالة استخراج معلومات الفاتورة من النص
function extractInvoiceInfo(text, fileName) {
  const info = {
    invoiceNumber: null,
    amount: null,
    date: null,
    company: null
  };
  
  // البحث عن رقم الفاتورة
  const invoiceNumberMatch = text.match(/(?:invoice|فاتورة|رقم).{0,10}(\d{4,})/i);
  if (invoiceNumberMatch) {
    info.invoiceNumber = invoiceNumberMatch[1];
  }
  
  // البحث عن المبلغ
  const amountMatch = text.match(/(?:total|المجموع|المبلغ).{0,20}(\d+\.?\d*)/i);
  if (amountMatch) {
    info.amount = parseFloat(amountMatch[1]);
  }
  
  // البحث عن التاريخ
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (dateMatch) {
    info.date = moment(dateMatch[1], ['DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY']).toDate();
  }
  
  return info;
}

// دالة جلب الرسائل من Gmail
async function fetchEmailsWithAttachments() {
  try {
    console.log('🔍 البحث عن رسائل جديدة...');
    
    // البحث عن الرسائل التي تحتوي على مرفقات في آخر 24 ساعة
    const oneDayAgo = moment().subtract(1, 'day').format('YYYY/MM/DD');
    const query = `to:${process.env.TARGET_EMAIL} has:attachment after:${oneDayAgo}`;
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50
    });
    
    if (!response.data.messages) {
      console.log('لا توجد رسائل جديدة');
      return;
    }
    
    console.log(`📧 تم العثور على ${response.data.messages.length} رسالة`);
    
    // معالجة كل رسالة
    for (const message of response.data.messages) {
      await processMessage(message.id);
      // تأخير قصير لتجنب تجاوز حدود API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('خطأ في جلب الرسائل:', error);
  }
}

// دالة معالجة رسالة واحدة
async function processMessage(messageId) {
  try {
    // التحقق من أن الرسالة لم تتم معالجتها من قبل
    const processedDoc = await db.collection('processed_messages').doc(messageId).get();
    if (processedDoc.exists) {
      return; // تم معالجة هذه الرسالة من قبل
    }
    
    // جلب تفاصيل الرسالة
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });
    
    const headers = message.data.payload.headers;
    const fromHeader = headers.find(h => h.name === 'From');
    const subjectHeader = headers.find(h => h.name === 'Subject');
    const dateHeader = headers.find(h => h.name === 'Date');
    
    const senderEmail = fromHeader ? fromHeader.value : '';
    const subject = subjectHeader ? subjectHeader.value : '';
    const messageDate = dateHeader ? new Date(dateHeader.value) : new Date();
    
    console.log(`📨 معالجة رسالة من: ${senderEmail}`);
    console.log(`📋 الموضوع: ${subject}`);
    
    // البحث عن المرفقات
    const attachments = [];
    await findAttachments(message.data.payload, attachments);
    
    if (attachments.length === 0) {
      console.log('لا توجد مرفقات مناسبة في هذه الرسالة');
      return;
    }
    
    // معالجة كل مرفق
    for (const attachment of attachments) {
      await processAttachment(attachment, senderEmail, subject, messageDate, messageId);
    }
    
    // تسجيل أن الرسالة تمت معالجتها
    await db.collection('processed_messages').doc(messageId).set({
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      senderEmail,
      subject,
      messageDate,
      attachmentsCount: attachments.length
    });
    
  } catch (error) {
    console.error(`خطأ في معالجة الرسالة ${messageId}:`, error);
  }
}

// دالة البحث عن المرفقات في الرسالة
async function findAttachments(payload, attachments) {
  if (payload.parts) {
    for (const part of payload.parts) {
      await findAttachments(part, attachments);
    }
  } else if (payload.body && payload.body.attachmentId) {
    const filename = payload.filename;
    const mimeType = payload.mimeType;
    
    // قبول PDF والصور فقط
    if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
      attachments.push({
        attachmentId: payload.body.attachmentId,
        filename: filename || 'unknown',
        mimeType: mimeType,
        size: payload.body.size
      });
    }
  }
}

// دالة معالجة مرفق واحد
async function processAttachment(attachment, senderEmail, subject, messageDate, messageId) {
  try {
    console.log(`📎 معالجة مرفق: ${attachment.filename}`);
    
    // تحميل المرفق
    const attachmentData = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachment.attachmentId
    });
    
    const fileBuffer = Buffer.from(attachmentData.data.data, 'base64');
    
    // تصنيف الفاتورة
    const classification = classifyInvoice(attachment.filename, senderEmail, subject);
    
    console.log(`🏷️ تصنيف: ${classification.category}`);
    
    // رفع الملف إلى التخزين السحابي
    const fileUrl = await uploadFileToStorage(fileBuffer, attachment.filename, classification.category);
    
    // استخراج معلومات إضافية إذا كان الملف PDF
    let extractedInfo = {};
    if (attachment.mimeType === 'application/pdf') {
      const pdfText = await extractTextFromPDF(fileBuffer);
      extractedInfo = extractInvoiceInfo(pdfText, attachment.filename);
    }
    
    // حفظ بيانات الفاتورة في قاعدة البيانات
    const invoiceData = {
      fileName: attachment.filename,
      originalMessageId: messageId,
      category: classification.category,
      source: classification.source,
      isKnownSource: classification.isKnownSource,
      fileUrl: fileUrl,
      fileSize: attachment.size,
      mimeType: attachment.mimeType,
      senderEmail: senderEmail,
      emailSubject: subject,
      messageDate: messageDate,
      date: extractedInfo.date || messageDate,
      invoiceNumber: extractedInfo.invoiceNumber,
      amount: extractedInfo.amount,
      company: extractedInfo.company,
      uploadedManually: false,
      uploadedBy: 'نظام تلقائي',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      extractedText: attachment.mimeType === 'application/pdf' ? true : false
    };
    
    const docRef = await db.collection('invoices').add(invoiceData);
    
    console.log(`✅ تم حفظ الفاتورة: ${docRef.id}`);
    
    // تحديث إحصائيات
    await updateStats(classification.category);
    
  } catch (error) {
    console.error(`خطأ في معالجة المرفق ${attachment.filename}:`, error);
  }
}

// دالة تحديث الإحصائيات
async function updateStats(category) {
  try {
    const statsRef = db.collection('stats').doc('invoices');
    const statsDoc = await statsRef.get();
    
    if (statsDoc.exists) {
      const data = statsDoc.data();
      const categories = data.categories || {};
      categories[category] = (categories[category] || 0) + 1;
      
      await statsRef.update({
        totalInvoices: admin.firestore.FieldValue.increment(1),
        categories: categories,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await statsRef.set({
        totalInvoices: 1,
        categories: { [category]: 1 },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('خطأ في تحديث الإحصائيات:', error);
  }
}

// تشغيل جلب الفواتير كل ساعة
cron.schedule('0 * * * *', () => {
  console.log('🔄 بدء المهمة المجدولة لجلب الفواتير...');
  fetchEmailsWithAttachments();
});

// تشغيل أولي عند بدء الخدمة
console.log('🚀 خدمة جلب فواتير Gmail بدأت العمل');
console.log('📅 المهمة المجدولة: كل ساعة');
console.log(`📧 البريد المستهدف: ${process.env.TARGET_EMAIL}`);

// تشغيل فوري لاختبار النظام
setTimeout(() => {
  console.log('🔄 تشغيل فوري لاختبار النظام...');
  fetchEmailsWithAttachments();
}, 5000);

// معالجة إشارات الإغلاق
process.on('SIGINT', () => {
  console.log('🛑 إيقاف خدمة جلب الفواتير...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 إيقاف خدمة جلب الفواتير...');
  process.exit(0);
});
