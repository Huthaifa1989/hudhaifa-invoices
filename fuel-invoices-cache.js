const FUEL_CACHE_FILE = './fuel-invoices-cache.json';

function readFuelCache() {
  const fs = require('fs');
  if (!fs.existsSync(FUEL_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FUEL_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeFuelCache(files) {
  const fs = require('fs');
  fs.writeFileSync(FUEL_CACHE_FILE, JSON.stringify(files, null, 2));
}

async function fetchAndCacheFuelInvoices(drive) {
  const folderId = '1yHrqkmMP0brzJ4iwnEIz22DejTHaF7vy';
  const driveRes = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, createdTime, webViewLink)',
    pageSize: 50
  });
  const files = (driveRes.data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    link: file.webViewLink
  }));

  // أضف فقط الملفات الجديدة للكاش
  let cache = readFuelCache();
  let cacheIds = cache.map(f => f.id);
  files.forEach(file => {
    if (!cacheIds.includes(file.id)) cache.push(file);
  });
  writeFuelCache(cache);
  return cache;
}

module.exports = { fetchAndCacheFuelInvoices, readFuelCache, writeFuelCache };
