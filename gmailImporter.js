// استيراد الفواتير من Gmail باستخدام Google APIs
const { google } = require('googleapis');

async function importWoltInvoices(oAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: '"חשבונית מס, קבלה או זיכוי Wolt"',
    maxResults: 50
  });

  const messages = res.data.messages || [];
  const invoices = [];
  for (const msg of messages) {
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = msgRes.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    if (subject.includes('חשבונית מס, קבלה או זיכוי Wolt')) {
      invoices.push({
        id: msg.id,
        from: headers.find(h => h.name === 'From')?.value || '',
        subject,
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: msgRes.data.snippet || ''
      });
    }
  }
  return invoices;
}

module.exports = { importWoltInvoices };