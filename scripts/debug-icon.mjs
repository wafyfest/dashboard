import http from 'http';

http.get('http://localhost:3000/icon.svg', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:\n', body);
  });
}).on('error', console.error);
