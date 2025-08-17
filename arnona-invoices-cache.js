const ARNONA_CACHE_FILE = './arnona-invoices-cache.json';

function readArnonaCache() {
  const fs = require('fs');
  if (!fs.existsSync(ARNONA_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ARNONA_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeArnonaCache(invoices) {
  const fs = require('fs');
  fs.writeFileSync(ARNONA_CACHE_FILE, JSON.stringify(invoices, null, 2));
}

async function fetchAndCacheArnonaInvoices(gmail) {
  const resList = await gmail.users.messages.list({
    userId: 'me',
    q: '"עיריית ירושלים"',
    maxResults: 50
  });
  const messages = resList.data.messages || [];
  let cache = readArnonaCache();
  let cacheIds = cache.map(inv => inv.id);
  for (const msg of messages) {
    if (cacheIds.includes(msg.id)) continue;
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = msgRes.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    if (
      subject.includes('עיריית ירושלים') ||
      from.includes('עיריית ירושלים')
    ) {
      cache.push({
        id: msg.id,
        from,
        subject,
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: msgRes.data.snippet || ''
      });
    }
  }
  writeArnonaCache(cache);
  return cache;
}

module.exports = { fetchAndCacheArnonaInvoices, readArnonaCache, writeArnonaCache };