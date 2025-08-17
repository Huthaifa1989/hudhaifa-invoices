const ELECTRIC_CACHE_FILE = './electric-invoices-cache.json';

function readElectricCache() {
  const fs = require('fs');
  if (!fs.existsSync(ELECTRIC_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ELECTRIC_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeElectricCache(invoices) {
  const fs = require('fs');
  fs.writeFileSync(ELECTRIC_CACHE_FILE, JSON.stringify(invoices, null, 2));
}

async function fetchAndCacheElectricInvoices(gmail) {
  const resList = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:eservicest@jdeco.net',
    maxResults: 50
  });
  const messages = resList.data.messages || [];
  let cache = readElectricCache();
  let cacheIds = cache.map(inv => inv.id);
  for (const msg of messages) {
    if (cacheIds.includes(msg.id)) continue;
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = msgRes.data.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    if (from.includes('eservicest@jdeco.net')) {
      cache.push({
        id: msg.id,
        from,
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: msgRes.data.snippet || ''
      });
    }
  }
  writeElectricCache(cache);
  return cache;
}

module.exports = { fetchAndCacheElectricInvoices, readElectricCache, writeElectricCache };