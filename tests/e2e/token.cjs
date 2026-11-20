const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET;
const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const payload = { sub: '11111111-1111-1111-1111-111111111111', role: 'authenticated', aud: 'authenticated', email: 'nmduc@aiedu.com.vn', exp: now + 86400, iat: now };
const h = b({ alg: 'HS256', typ: 'JWT' }), p = b(payload);
const tok = h + '.' + p + '.' + crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
const session = { access_token: tok, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400,
  user: { id: payload.sub, aud: 'authenticated', role: 'authenticated', email: payload.email, user_metadata: { full_name: 'Nguyễn Minh Đức' }, app_metadata: {} } };
process.stdout.write('base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'));
