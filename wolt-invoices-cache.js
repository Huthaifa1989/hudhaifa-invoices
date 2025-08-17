const WOLT_CACHE_FILE = './wolt-invoices-cache.json';

function readWoltCache() {
  if (!fs.existsSync(WOLT_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(WOLT_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeWoltCache(invoices) {
  fs.writeFileSync(WOLT_CACHE_FILE, JSON.stringify(invoices, null, 2));
}

async function fetchAndCacheWoltInvoices() {
  const resList = await gmail.users.messages.list({
    userId: 'me',
    q: '"חשבונית מס, קבלה או זיכוי Wolt"',
    maxResults: 50
  });
  const messages = resList.data.messages || [];
  let cache = readWoltCache();
  let cacheIds = cache.map(inv => inv.id);
  for (const msg of messages) {
    if (cacheIds.includes(msg.id)) continue; // موجودة بالفعل
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = msgRes.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    if (subject.includes('חשבונית מס, קבלה או זיכוי Wolt')) {
      cache.push({
        id: msg.id,
        from: headers.find(h => h.name === 'From')?.value || '',
        subject,
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: msgRes.data.snippet || ''
      });
    }
  }
  writeWoltCache(cache);
  return cache;
}

// Endpoint لجلب فواتير Wolt من الكاش وتحديثه
app.get('/api/invoices/wolt', async (req, res) => {
  try {
    const invoices = await fetchAndCacheWoltInvoices();
    res.json({ wolt: invoices });
  } catch (err) {
    res.status(500).json({ error: 'failed_fetch', details: err.message });
  }
});