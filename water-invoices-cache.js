const WATER_CACHE_FILE = './water-invoices-cache.json';

function readWaterCache() {
  const fs = require('fs');
  if (!fs.existsSync(WATER_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(WATER_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeWaterCache(invoices) {
  const fs = require('fs');
  fs.writeFileSync(WATER_CACHE_FILE, JSON.stringify(invoices, null, 2));
}

async function fetchAndCacheWaterInvoices(gmail) {
  const resList = await gmail.users.messages.list({
    userId: 'me',
    q: '"חשבון מים תקופתי הגיחון"',
    maxResults: 50
  });
  const messages = resList.data.messages || [];
  let cache = readWaterCache();
  let cacheIds = cache.map(inv => inv.id);
  for (const msg of messages) {
    if (cacheIds.includes(msg.id)) continue;
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = msgRes.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    if (subject.includes('חשבון מים תקופתי הגיחון')) {
      cache.push({
        id: msg.id,
        from: headers.find(h => h.name === 'From')?.value || '',
        subject,
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: msgRes.data.snippet || ''
      });
    }
  }
  writeWaterCache(cache);
  return cache;
}

module.exports = { fetchAndCacheWaterInvoices, readWaterCache, writeWaterCache };