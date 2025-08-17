const MANUAL_CACHE_FILE = './manual-invoices-cache.json';

function readManualCache() {
  const fs = require('fs');
  if (!fs.existsSync(MANUAL_CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANUAL_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeManualCache(invoices) {
  const fs = require('fs');
  fs.writeFileSync(MANUAL_CACHE_FILE, JSON.stringify(invoices, null, 2));
}

function addManualInvoice(invoice) {
  let cache = readManualCache();
  cache.push(invoice);
  writeManualCache(cache);
  return cache;
}

module.exports = { readManualCache, writeManualCache, addManualInvoice };