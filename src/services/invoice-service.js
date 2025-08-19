const { getCollection, getDocument, createBatch } = require('../config/firebase');
const { gmail, drive } = require('../config/google-apis');
const logger = require('../config/logger');

// Configuration constants
const COOLDOWN_SEC = parseInt(process.env.COOLDOWN_SEC || '180', 10);
const FUEL_FOLDER_ID = process.env.FUEL_FOLDER_ID || '';
const MAX_DB_DOCS = parseInt(process.env.MAX_DB_DOCS || '5000', 10);

// Invoice categories for classification
const categories = [
  { key: 'wolt', keywords: ['Wolt', 'חשבונית מס', 'קבלה', 'זיכוי Wolt', 'وولت'] },
  { key: 'gas', keywords: ['بنزين', 'ديزل', 'وقود'] },
  { key: 'electric', keywords: ['كهرباء', 'חשמל', 'شركة الكهرباء', 'חברת החשמל'] },
  { key: 'water', keywords: ['مياه', 'חברת המים', 'شركة المياه', 'מימי'] },
  { key: 'arnona', keywords: ['أرنونا', 'ארנונה'] },
];

// Helper function to generate invoice document ID
function invDocId(source, originId) {
  return `${source}_${originId}`;
}

// Helper function to sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper function to upsert invoice document
async function upsertInvoice(doc) {
  try {
    const ref = getDocument('invoices', doc.id);
    await ref.set(doc, { merge: true });
    logger.debug('Invoice upserted successfully', { id: doc.id, type: doc.type });
  } catch (error) {
    logger.error('Failed to upsert invoice', { id: doc.id, error: error.message });
    throw error;
  }
}

// Helper function to get invoices by type
async function bulkGetByType(type, limit = 100) {
  try {
    const snap = await getCollection('invoices')
      .where('type', '==', type)
      .orderBy('ts', 'desc')
      .limit(limit)
      .get();
    
    const invoices = snap.docs.map(d => d.data());
    logger.debug(`Retrieved ${invoices.length} invoices of type ${type}`);
    return invoices;
  } catch (error) {
    logger.error('Failed to get invoices by type', { type, error: error.message });
    throw error;
  }
}

// Helper function to get manual files list
async function getManualFilesList() {
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(uploadsDir);
    return files.map(filename => ({
      name: filename,
      url: `/uploads/${filename}`,
      uploadedAt: fs.statSync(path.join(uploadsDir, filename)).mtime
    }));
  } catch (error) {
    logger.error('Failed to get manual files list', { error: error.message });
    return [];
  }
}

// Get sync metadata
async function getSyncMeta() {
  try {
    const doc = await getDocument('meta', 'sync').get();
    return doc.exists ? doc.data() : {};
  } catch (error) {
    logger.error('Failed to get sync metadata', { error: error.message });
    return {};
  }
}

// Set sync metadata
async function setSyncMeta(fields) {
  try {
    await getDocument('meta', 'sync').set(fields, { merge: true });
    logger.debug('Sync metadata updated', fields);
  } catch (error) {
    logger.error('Failed to set sync metadata', { error: error.message });
    throw error;
  }
}

// Classify invoice by subject and from fields
function classifyBySubjectFrom(subject = '', from = '') {
  const lower = (subject + ' ' + from).toLowerCase();
  
  if (lower.includes('wolt') || subject.includes('وولت') || from.includes('وولت')) {
    return 'wolt';
  }
  
  for (const c of categories) {
    if (
      c.key !== 'wolt' &&
      c.keywords.some(k => 
        subject.includes(k) || 
        from.includes(k) || 
        lower.includes((k || '').toLowerCase())
      )
    ) {
      return c.key;
    }
  }
  
  if (subject.includes('فاتورة')) return 'other';
  return null;
}

// Classify Drive file
function classifyDriveFile(file) {
  if ((file.parents || []).includes(FUEL_FOLDER_ID)) return 'gas';
  if ((file.name || '').includes('بنزين')) return 'gas';
  return 'other';
}

// Clear invoices collection if quota exceeded
async function clearInvoicesCollection() {
  try {
    const batchSize = 500;
    let deleted = 0;
    
    while (true) {
      const snapshot = await getCollection('invoices').limit(batchSize).get();
      if (snapshot.empty) break;
      
      const batch = createBatch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      deleted += snapshot.docs.length;
      logger.info(`Deleted ${snapshot.docs.length} invoices from batch`);
      
      if (snapshot.docs.length < batchSize) break;
    }
    
    logger.info(`Total invoices deleted: ${deleted}`);
    return deleted;
  } catch (error) {
    logger.error('Failed to clear invoices collection', { error: error.message });
    throw error;
  }
}

// Check and clear quota if needed
async function checkAndClearQuotaIfNeeded() {
  try {
    const snap = await getCollection('invoices').limit(MAX_DB_DOCS + 1).get();
    if (snap.size > MAX_DB_DOCS) {
      logger.warn(`Database quota exceeded (${snap.size} > ${MAX_DB_DOCS}), clearing collection`);
      await clearInvoicesCollection();
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to check quota', { error: error.message });
    return false;
  }
}

// Sync Gmail invoices
async function syncGmail({ forceFull = false } = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const meta = await getSyncMeta();
  const sinceSec = forceFull ? 0 : (meta.gmailLastSyncSec || 0);

  let pageToken = null;
  let fetched = 0;

  logger.info('Starting Gmail sync', { sinceSec, forceFull });

  try {
    do {
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        q: sinceSec ? `after:${sinceSec}` : undefined,
        pageToken,
      });

      const msgs = listRes.data.messages || [];
      logger.debug(`Processing ${msgs.length} Gmail messages`);

      for (const m of msgs) {
        await sleep(180); // Rate limiting

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
          from,
          subject,
          date,
          snippet,
          ts: new Date(date).toString() === 'Invalid Date' ? new Date() : new Date(date),
        });

        fetched++;
      }

      pageToken = listRes.data.nextPageToken || null;
      if (pageToken) await sleep(250);
    } while (pageToken);

    await setSyncMeta({ gmailLastSyncSec: nowSec });
    logger.info('Gmail sync completed', { fetched });
    return { fetched };
  } catch (error) {
    logger.error('Gmail sync failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Sync Drive invoices
async function syncDrive() {
  const nowSec = Math.floor(Date.now() / 1000);
  let pageToken = null;
  let fetched = 0;

  logger.info('Starting Drive sync');

  try {
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
      logger.debug(`Processing ${files.length} Drive files`);

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
    logger.info('Drive sync completed', { fetched });
    return { fetched };
  } catch (error) {
    logger.error('Drive sync failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Conditional refresh with cooldown
async function maybeRefresh({ kind }) {
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

  // Check quota before refresh
  const cleared = await checkAndClearQuotaIfNeeded();

  const results = {};
  
  try {
    if (needGmail || cleared) {
      results.gmail = await syncGmail({});
    }
  } catch (e) {
    logger.error('Gmail sync error', { error: e?.response?.data || e.message });
    results.gmail = { error: 'gmail_sync_failed' };
  }
  
  try {
    if (needDrive || cleared) {
      results.drive = await syncDrive();
    }
  } catch (e) {
    logger.error('Drive sync error', { error: e?.response?.data || e.message });
    results.drive = { error: 'drive_sync_failed' };
  }

  return results;
}

// Get all invoices
async function getAllInvoices(refresh = false) {
  try {
    if (refresh) {
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
    
    return {
      gmail: { wolt, electric, water, arnona, other: [] },
      drive: { gas: gasDrive, other: [] },
      manual,
    };
  } catch (error) {
    logger.error('Failed to get all invoices', { error: error.message });
    throw error;
  }
}

// Get categorized invoices
async function getCategorizedInvoices(refresh = false) {
  try {
    if (refresh) {
      maybeRefresh({ kind: 'gmail' }).catch(() => {});
    }
    
    const [wolt, electric, water, arnona] = await Promise.all([
      bulkGetByType('wolt', 200),
      bulkGetByType('electric', 200),
      bulkGetByType('water', 200),
      bulkGetByType('arnona', 200),
    ]);
    
    return { invoices: { wolt, electric, water, arnona, other: [] } };
  } catch (error) {
    logger.error('Failed to get categorized invoices', { error: error.message });
    throw error;
  }
}

// Get invoices by type
async function getInvoicesByType(type, refresh = false, refreshKind = 'gmail') {
  try {
    if (refresh) {
      maybeRefresh({ kind: refreshKind }).catch(() => {});
    }
    
    const data = await bulkGetByType(type, 200);
    return { invoices: data };
  } catch (error) {
    logger.error(`Failed to get invoices by type ${type}`, { error: error.message });
    throw error;
  }
}

// Get fuel invoices with pagination
async function getFuelInvoices(page = 1, pageSize = 20, refresh = false) {
  try {
    if (refresh) {
      maybeRefresh({ kind: 'drive' }).catch(() => {});
    }
    
    const allGas = await bulkGetByType('gas', 1000);
    const total = allGas.length;
    const start = (page - 1) * pageSize;
    const slice = allGas.slice(start, start + pageSize);

    return { invoices: slice, page, pageSize, total };
  } catch (error) {
    logger.error('Failed to get fuel invoices', { error: error.message });
    throw error;
  }
}

// Get invoice statistics
async function getInvoiceStats() {
  try {
    const [wolt, electric, water, arnona, gas, other] = await Promise.all([
      bulkGetByType('wolt', 1000),
      bulkGetByType('electric', 1000),
      bulkGetByType('water', 1000),
      bulkGetByType('arnona', 1000),
      bulkGetByType('gas', 1000),
      bulkGetByType('other', 1000),
    ]);

    const total = wolt.length + electric.length + water.length + arnona.length + gas.length + other.length;
    
    return {
      total,
      byType: {
        wolt: wolt.length,
        electric: electric.length,
        water: water.length,
        arnona: arnona.length,
        gas: gas.length,
        other: other.length,
      },
      bySource: {
        gmail: wolt.length + electric.length + water.length + arnona.length + other.length,
        drive: gas.length,
      }
    };
  } catch (error) {
    logger.error('Failed to get invoice statistics', { error: error.message });
    throw error;
  }
}

module.exports = {
  getAllInvoices,
  getCategorizedInvoices,
  getInvoicesByType,
  getFuelInvoices,
  getInvoiceStats,
  maybeRefresh,
  syncGmail,
  syncDrive,
  getManualFilesList,
  checkAndClearQuotaIfNeeded
};
