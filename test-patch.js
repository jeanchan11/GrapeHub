const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clients/undefined', // we don't have a real ID but we can check if it crashes
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, res => {
  console.log('statusCode:', res.statusCode);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', e => {
  console.error(e);
});

req.write(JSON.stringify({ aviso_previo_date: '2026-05-14' }));
req.end();
