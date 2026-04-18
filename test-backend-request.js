const http = require('http');
const data = JSON.stringify({
  name: '테스트',
  email: 'test@example.com',
  phone: '010-1234-5678',
  skin_condition: '건성',
  concern: '탄력',
  message: '테스트 문의입니다'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/consultation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  res.on('data', (chunk) => process.stdout.write(chunk));
  res.on('end', () => process.stdout.write('\n'));
});

req.on('error', (error) => {
  console.error('request error:', error);
});

req.write(data);
req.end();
