// اختبار جاهزية السيرفر في بيئة الإنتاج

const axios = require('axios');

const url = 'https://hudhaifa-invoices-backend-279579602372.us-central1.run.app/api/invoices/all';

axios.get(url)
  .then(response => {
    console.log('Production test successful!');
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Production test failed!');
    console.error(error.message);
  });