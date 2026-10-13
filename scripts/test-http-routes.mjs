import http from 'http';

const routesToTest = [
  { path: '/', expectedStatuses: [200], desc: 'Public Landing Page' },
  { path: '/login', expectedStatuses: [200], desc: 'Login Page' },
  { path: '/student', expectedStatuses: [200], desc: 'Student View / Portal' },
  { path: '/student-login', expectedStatuses: [200], desc: 'Student Login Page' },
  { path: '/admin', expectedStatuses: [307, 308, 302, 200], desc: 'Admin Console (Unauth should redirect to /login)' },
  { path: '/college', expectedStatuses: [307, 308, 302, 200], desc: 'College Portal (Unauth should redirect)' },
  { path: '/convenor', expectedStatuses: [307, 308, 302, 200], desc: 'Convenor Portal (Unauth should redirect)' },
  { path: '/result-entry', expectedStatuses: [307, 308, 302, 200], desc: 'Result Entry (Unauth should redirect)' },
  { path: '/stage-controller', expectedStatuses: [307, 308, 302, 200], desc: 'Stage Controller (Unauth should redirect)' },
  { path: '/non-existent-route-404', expectedStatuses: [404, 307], desc: 'Non-existent route' },
  { path: '/icon.svg', expectedStatuses: [200], desc: 'Icon SVG asset' }
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: route.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node-Health-Check'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        const passed = route.expectedStatuses.includes(res.statusCode);
        resolve({
          path: route.path,
          desc: route.desc,
          statusCode: res.statusCode,
          location: res.headers.location || 'none',
          duration: `${duration}ms`,
          bodyLength: body.length,
          status: passed ? 'PASS' : 'FAIL',
          title: body.match(/<title>(.*?)<\/title>/i)?.[1] || 'No title tag'
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        path: route.path,
        desc: route.desc,
        statusCode: 'CONN_ERR',
        location: 'none',
        duration: `${Date.now() - start}ms`,
        bodyLength: 0,
        status: 'FAIL',
        title: err.message
      });
    });

    req.end();
  });
}

async function run() {
  console.log('Testing running server at http://localhost:3000...');
  const results = [];
  for (const r of routesToTest) {
    results.push(await checkRoute(r));
  }
  console.table(results);
}

run();
