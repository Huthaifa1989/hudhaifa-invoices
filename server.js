/************************************************************
 * Hudhaifa Invoices Backend — Firestore Caching Edition
 * إضافة تفريغ الكوتا: إذا تجاوزت الكوتا أو امتلأت قاعدة البيانات، يتم حذف جميع الفواتير القديمة وإعادة تعبئة البيانات من Gmail/Drive.
 ************************************************************/

require('dotenv').config();
const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const COOLDOWN_SEC = parseInt(process.env.COOLDOWN_SEC || '180', 10);
const FUEL_FOLDER_ID = process.env.FUEL_FOLDER_ID || '';
const MAX_DB_DOCS = parseInt(process.env.MAX_DB_DOCS || '5000', 10); // حد أقصى للفواتير في قاعدة البيانات

const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = (req.files || []).map(file => ({
    name: file.originalname,
    url: `/uploads/${file.filename}`,
  }));
  res.json({ files });
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (_, res) => res.json({ status: 'OK' }));
app.get('/api/health', (_, res) => res.json({ status: 'OK' }));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

const categories = [
  { key: 'wolt', keywords: ['Wolt', 'חשבונית מס', 'קבלה', 'זיכוי Wolt', 'وولت'] },
  { key: 'gas', keywords: ['بنزين', 'ديزل', 'وقود'] },
  { key: 'electric', keywords: ['كهرباء', 'חשמל', 'شركة الكهرباء', 'חברת החשמל'] },
  { key: 'water', keywords: ['مياه', 'חברת המים', 'شركة المياه', 'מימי'] },
  { key: 'arnona', keywords: ['أرنونا', 'ארנונה'] },
];

function invDocId(source, originId) {
  return `${source}_${originId}`;
}

async function upsertInvoice(doc) {
  const ref = db.collection('invoices').doc(doc.id);
  await ref.set(doc, { merge: true });
}

async function bulkGetByType(type, limit = 100) {
  const snap = await db
    .collection('invoices')
    .where('type', '==', type)
    .orderBy('ts', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => d.data());
}

async function getManualFilesList() {
  try {
    const files = fs.readdirSync(path.join(__dirname, 'uploads'));
    return files.map(filename => ({
      name: filename,
      url: `/uploads/${filename}`,
    }));
  } catch {
    return [];
  }
}

const META_DOC = db.collection('meta').doc('sync');

async function getSyncMeta() {
  const doc = await META_DOC.get();
  return doc.exists ? doc.data() : {};
}
async function setSyncMeta(fields) {
  await META_DOC.set(fields, { merge: true });
}

function classifyBySubjectFrom(subject = '', from = '') {
  const lower = (subject + ' ' + from).toLowerCase();
  if (lower.includes('wolt') || subject.includes('وولت') || from.includes('وولت')) {
    return 'wolt';
  }
  for (const c of categories) {
    if (
      c.key !== 'wolt' &&
      c.keywords.some(k => subject.includes(k) || from.includes(k) || lower.includes((k || '').toLowerCase()))
    ) {
      return c.key;
    }
  }
  if (subject.includes('فاتورة')) return 'other';
  return null;
}

function classifyDriveFile(file) {
  if ((file.parents || []).includes(FUEL_FOLDER_ID)) return 'gas';
  if ((file.name || '').includes('بنزين')) return 'gas';
  return 'other';
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ====== تفريغ قاعدة البيانات إذا تجاوزت الكوتا ======
async function clearInvoicesCollection() {
  const batchSize = 500;
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection('invoices').limit(batchSize).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.docs.length;
    if (snapshot.docs.length < batchSize) break;
  }
  return deleted;
}

async function checkAndClearQuotaIfNeeded() {
  const snap = await db.collection('invoices').limit(MAX_DB_DOCS + 1).get();
  if (snap.size > MAX_DB_DOCS) {
    await clearInvoicesCollection();
    return true;
  }
  return false;
}

// === مزامنة Gmail (جلب الجديد فقط) ===
async function syncGmail({ forceFull = false } = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const meta = await getSyncMeta();
  const sinceSec = forceFull ? 0 : (meta.gmailLastSyncSec || 0);

  let pageToken = null;
  let fetched = 0;

  do {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      q: sinceSec ? `after:${sinceSec}` : undefined,
      pageToken,
    });

    const msgs = listRes.data.messages || [];
    for (const m of msgs) {
      await sleep(180);

      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = msgRes.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const snippet = msgRes.data.snippet || '';

      const type = classifyBySubjectFrom(subject, from) || 'other';

      await upsertInvoice({
        id: invDocId('gmail', m.id),
        originId: m.id,
        source: 'gmail',
        type,
        from, subject, date, snippet,
        ts: new Date(date).toString() === 'Invalid Date' ? new Date() : new Date(date),
      });

      fetched++;
    }

    pageToken = listRes.data.nextPageToken || null;
    if (pageToken) await sleep(250);
  } while (pageToken);

  await setSyncMeta({ gmailLastSyncSec: nowSec });
  return { fetched };
}

// === مزامنة Drive ===
async function syncDrive() {
  const nowSec = Math.floor(Date.now() / 1000);
  let pageToken = null;
  let fetched = 0;

  const mimeQ = `(mimeType='application/pdf' or mimeType contains 'image/')`;
  const nameQ = `name contains 'فاتورة' or name contains 'بنزين'`;
  const folderQ = FUEL_FOLDER_ID ? `'${FUEL_FOLDER_ID}' in parents or (${nameQ})` : nameQ;
  const q = `${mimeQ} and (${folderQ})`;

  do {
    const res = await drive.files.list({
      q,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, webViewLink, parents)',
      pageSize: 100,
      pageToken,
      orderBy: 'modifiedTime desc',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    for (const f of files) {
      const type = classifyDriveFile(f);

      await upsertInvoice({
        id: invDocId('drive', f.id),
        originId: f.id,
        source: 'drive',
        type,
        name: f.name,
        mimeType: f.mimeType,
        link: f.webViewLink,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
        ts: f.modifiedTime ? new Date(f.modifiedTime) : (f.createdTime ? new Date(f.createdTime) : new Date()),
      });

      fetched++;
    }

    pageToken = res.data.nextPageToken || null;
    if (pageToken) await sleep(250);
  } while (pageToken);

  await setSyncMeta({ driveLastSyncSec: nowSec });
  return { fetched };
}

// === منطق التحديث المشروط بالكوول داون + تفريغ الكوتا عند الحاجة ===
async function maybeRefresh({ kind }) {
  // kind: 'gmail' | 'drive' | 'both'
  const meta = await getSyncMeta();
  const nowSec = Math.floor(Date.now() / 1000);

  let needGmail = false;
  let needDrive = false;

  if (kind === 'gmail' || kind === 'both') {
    needGmail = (nowSec - (meta.gmailLastSyncSec || 0)) >= COOLDOWN_SEC;
  }
  if (kind === 'drive' || kind === 'both') {
    needDrive = (nowSec - (meta.driveLastSyncSec || 0)) >= COOLDOWN_SEC;
  }

  // تحقق من الكوتا قبل التحديث
  const cleared = await checkAndClearQuotaIfNeeded();

  const results = {};
  try {
    if (needGmail || cleared) results.gmail = await syncGmail({});
  } catch (e) {
    console.error('Gmail sync error:', e?.response?.data || e.message);
    results.gmail = { error: 'gmail_sync_failed' };
  }
  try {
    if (needDrive || cleared) results.drive = await syncDrive();
  } catch (e) {
    console.error('Drive sync error:', e?.response?.data || e.message);
    results.drive = { error: 'drive_sync_failed' };
  }

  return results;
}

// === APIs ===

app.get('/api/invoices/all', async (req, res) => {
  try {
    if (req.query.refresh === '1') {
      maybeRefresh({ kind: 'both' }).catch(() => {});
    }
    const [wolt, electric, water, arnona, gasDrive] = await Promise.all([
      bulkGetByType('wolt', 200),
      bulkGetByType('electric', 200),
      bulkGetByType('water', 200),
      bulkGetByType('arnona', 200),
      bulkGetByType('gas', 200),
    ]);
    const manual = await getManualFilesList();
    res.json({
      gmail: { wolt, electric, water, arnona, other: [] },
      drive: { gas: gasDrive, other: [] },
      manual,
    });
  } catch (err) {
    console.error('API /all error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'TEMPORARY_OUTAGE' });
  }
});

app.get('/api/invoices/categorized', async (req, res) => {
  try {
    if (req.query.refresh === '1') maybeRefresh({ kind: 'gmail' }).catch(() => {});
    const [wolt, electric, water, arnona] = await Promise.all([
      bulkGetByType('wolt', 200),
      bulkGetByType('electric', 200),
      bulkGetByType('water', 200),
      bulkGetByType('arnona', 200),
    ]);
    res.json({ invoices: { wolt, electric, water, arnona, other: [] } });
  } catch (err) {
    res.status(500).json({ error: 'TEMPORARY_OUTAGE' });
  }
});

async function listTypeEndpoint(req, res, type, refreshKind = 'gmail') {
  try {
    if (req.query.refresh === '1') {
      maybeRefresh({ kind: refreshKind }).catch(() => {});
    }
    const data = await bulkGetByType(type, 200);
    res.json({ invoices: data });
  } catch (err) {
    console.error(`/api/invoices/${type} error:`, err?.response?.data || err.message);
    res.status(500).json({ error: 'TEMPORARY_OUTAGE' });
  }
}

app.get('/api/invoices/wolt', (req, res) => listTypeEndpoint(req, res, 'wolt', 'gmail'));
app.get('/api/invoices/water', (req, res) => listTypeEndpoint(req, res, 'water', 'gmail'));
app.get('/api/invoices/electricity', (req, res) => listTypeEndpoint(req, res, 'electric', 'gmail'));
app.get('/api/invoices/arnona', (req, res) => listTypeEndpoint(req, res, 'arnona', 'gmail'));

app.get('/api/invoices/fuel', async (req, res) => {
  try {
    if (req.query.refresh === '1') {
      maybeRefresh({ kind: 'drive' }).catch(() => {});
    }
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize || '20', 10), 100);

    const allGas = await bulkGetByType('gas', 1000);
    const total = allGas.length;
    const start = (page - 1) * pageSize;
    const slice = allGas.slice(start, start + pageSize);

    res.json({ invoices: slice, page, pageSize, total });
  } catch (err) {
    console.error('/api/invoices/fuel error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'TEMPORARY_OUTAGE' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});