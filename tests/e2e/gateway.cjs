// Cổng giả lập Supabase cho thử tích hợp cục bộ: /rest/v1 → PostgREST, /auth/v1/user → user theo JWT.
const http = require('http');
const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET;
const USERS = { '11111111-1111-1111-1111-111111111111': { email: 'nmduc@aiedu.com.vn', name: 'Nguyễn Minh Đức' } };
function verify(tok) {
  try {
    const [h, p, s] = tok.split('.');
    const sig = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
    if (sig !== s) return null;
    return JSON.parse(Buffer.from(p, 'base64url').toString());
  } catch { return null; }
}
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/auth/v1/user') {
    const c = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!c) { res.writeHead(401, { ...cors, 'content-type': 'application/json' }); return res.end('{"code":401,"error_code":"bad_jwt","msg":"invalid"}'); }
    res.writeHead(200, { ...cors, 'content-type': 'application/json' });
    return res.end(JSON.stringify({ id: c.sub, aud: 'authenticated', role: 'authenticated', email: USERS[c.sub]?.email ?? c.email, user_metadata: { full_name: USERS[c.sub]?.name ?? c.name ?? c.email }, app_metadata: {}, created_at: new Date().toISOString() }));
  }
  if (u.pathname.startsWith('/rest/v1/')) {
    const headers = { ...req.headers, host: 'localhost:3001' };
    if (!/^Bearer ey/.test(headers.authorization || '')) delete headers.authorization; // khoá publishable không phải JWT → anon
    const p = http.request({ host: 'localhost', port: 3001, path: u.pathname.slice(8) + u.search, method: req.method, headers }, (r) => {
      res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res);
    });
    req.pipe(p);
    return;
  }
  res.writeHead(404, cors); res.end('{}');
}).listen(54321, () => console.log('gateway 54321'));
