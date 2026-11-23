// Password gate for the KB editor (/admin.html) and every /api/* route.
//
// The chat (/chat, /tts, /, /screenshots) stays public. Everything that reads
// or changes the knowledge base needs the ADMIN_PASSWORD, sent with HTTP Basic
// auth: the browser shows its own sign-in box on /admin.html and then sends the
// same credentials with the page's fetch() calls, so admin.html needs no change.
// Any username works; only the password is checked.
//
// No ADMIN_PASSWORD set means the editor is closed (503), never open.
const crypto = require('crypto');

const REALM = 'GigPost KB editor';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_TOTAL = 100;

// The path as Express would route it: percent-decoded and lower-cased, so
// "/ADMIN.html", "/admin%2Ehtml" and "/%61pi/qa" are all caught.
function normalPath(req) {
  let p = req.path || '/';
  try { p = decodeURIComponent(p); } catch (e) { /* malformed: check as-is */ }
  return p.toLowerCase();
}

function isAdminPath(req) {
  const p = normalPath(req);
  return p === '/admin.html' || p === '/api' || p.startsWith('/api/');
}

function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest(); }

function passwordFrom(req) {
  const h = req.headers.authorization || '';
  const m = /^Basic\s+(.+)$/i.exec(h);
  if (!m) return null;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  return i === -1 ? null : decoded.slice(i + 1);
}

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function createAdminAuth({ password, now = Date.now } = {}) {
  const fails = new Map(); // ip -> { count, resetAt }
  let total = { count: 0, resetAt: 0 };

  function bucket(ip, t) {
    let b = fails.get(ip);
    if (!b || t > b.resetAt) { b = { count: 0, resetAt: t + WINDOW_MS }; fails.set(ip, b); }
    return b;
  }

  return function adminAuth(req, res, next) {
    if (!isAdminPath(req)) return next();

    if (!password) {
      return res.status(503).type('text/plain')
        .send('The KB editor is locked: set the ADMIN_PASSWORD environment variable on the server.');
    }

    const t = now();
    if (t > total.resetAt) total = { count: 0, resetAt: t + WINDOW_MS };
    const ip = clientIp(req);
    const mine = bucket(ip, t);
    if (mine.count >= MAX_FAILS_PER_IP || total.count >= MAX_FAILS_TOTAL) {
      return res.status(429).type('text/plain').send('Too many wrong passwords. Try again in 15 minutes.');
    }

    const given = passwordFrom(req);
    if (given !== null && crypto.timingSafeEqual(sha256(given), sha256(password))) return next();

    // A request with no password is the browser asking for the sign-in box,
    // not a guess, so only a wrong password counts towards the lockout.
    if (given !== null) { mine.count += 1; total.count += 1; }
    res.set('WWW-Authenticate', `Basic realm="${REALM}", charset="UTF-8"`);
    return res.status(401).type('text/plain').send('Password required.');
  };
}

module.exports = { createAdminAuth, isAdminPath };
