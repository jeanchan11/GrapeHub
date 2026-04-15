import http from 'http';
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/projects',
  method: 'GET',
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data.substring(0, 200)));
});
req.on('error', console.error);
req.end();
