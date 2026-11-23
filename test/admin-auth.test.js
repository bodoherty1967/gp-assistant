// The KB editor and every /api/* route need the admin password.
// Starts the real server.js on a free port with a throwaway KB file,
// so this checks the actual wiring, not a copy of it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.join(__dirname, '..');
const PASSWORD = 'correct horse battery staple';

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

async function startServer(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-test-'));
  fs.writeFileSync(path.join(dir, 'kb-qa.json'), JSON.stringify([
    { id: 'q1', question: 'Test question?', answer: 'Test answer.', category: 'General', audience: 'portal' },
  ]));
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, PORT: String(port), KB_QA_PATH: path.join(dir, 'kb-qa.json'), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/'); return { base, child, dir, log: () => out }; } catch (e) { await new Promise(r => setTimeout(r, 50)); }
  }
  child.kill();
  throw new Error('server did not start:\n' + out);
}

function stop(s) { if (!s) return; s.child.kill(); fs.rmSync(s.dir, { recursive: true, force: true }); }

const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const GOOD = { authorization: basic('admin', PASSWORD) };

let srv;
before(async () => { srv = await startServer({ ADMIN_PASSWORD: PASSWORD }); });
after(() => stop(srv));

const GATED = [
  ['GET', '/admin.html'],
  ['GET', '/api/qa'],
  ['POST', '/api/qa'],
  ['PUT', '/api/qa/q1'],
  ['DELETE', '/api/qa/q1'],
  ['GET', '/api/categories'],
  ['POST', '/api/upload-image'],
  ['GET', '/api/audit'],
  ['GET', '/api/embed-status'],
  ['POST', '/api/embed-all'],
];

for (const [method, url] of GATED) {
  test(`${method} ${url} without a password is 401 with a Basic challenge`, async () => {
    const res = await fetch(srv.base + url, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    assert.strictEqual(res.status, 401);
    assert.match(res.headers.get('www-authenticate') || '', /^Basic realm=/);
  });
}

test('the KB editor page and the Q&A list load with the right password', async () => {
  const page = await fetch(srv.base + '/admin.html', { headers: GOOD });
  assert.strictEqual(page.status, 200);
  assert.match(await page.text(), /<html/i);
  const qa = await fetch(srv.base + '/api/qa', { headers: GOOD });
  assert.strictEqual(qa.status, 200);
  assert.strictEqual((await qa.json())[0].id, 'q1');
});

test('the username is ignored, only the password counts', async () => {
  const res = await fetch(srv.base + '/api/qa', { headers: { authorization: basic('barry', PASSWORD) } });
  assert.strictEqual(res.status, 200);
});

test('a wrong password is 401 and changes nothing', async () => {
  const del = await fetch(srv.base + '/api/qa/q1', { method: 'DELETE', headers: { authorization: basic('admin', 'wrong') } });
  assert.strictEqual(del.status, 401);
  const qa = await fetch(srv.base + '/api/qa', { headers: GOOD });
  assert.strictEqual((await qa.json()).length, 1);
});

test('case and percent-encoding tricks do not get past the gate', async () => {
  for (const url of ['/ADMIN.html', '/admin%2Ehtml', '/API/qa', '/%61pi/qa', '/api/QA']) {
    const res = await fetch(srv.base + url);
    assert.notStrictEqual(res.status, 200, url + ' was served without a password');
  }
});

test('the public chat surface stays open: /, /chat, /screenshots', async () => {
  const home = await fetch(srv.base + '/');
  assert.strictEqual(home.status, 200);
  // No OPENAI_KEY in the test env, so /chat answers 500 "No OPENAI_KEY", proving it was not gated.
  const chat = await fetch(srv.base + '/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) });
  assert.notStrictEqual(chat.status, 401);
  const shot = await fetch(srv.base + '/screenshots/img-1.png');
  assert.notStrictEqual(shot.status, 401);
});

test('too many wrong passwords from one address are refused for a while', async () => {
  const s = await startServer({ ADMIN_PASSWORD: PASSWORD });
  try {
    const bad = { authorization: basic('admin', 'nope') };
    for (let i = 0; i < 10; i++) {
      const r = await fetch(s.base + '/api/qa', { headers: bad });
      assert.strictEqual(r.status, 401, `attempt ${i + 1}`);
    }
    const locked = await fetch(s.base + '/api/qa', { headers: GOOD });
    assert.strictEqual(locked.status, 429, 'the right password is refused too while locked');
    const chat = await fetch(s.base + '/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) });
    assert.notStrictEqual(chat.status, 429, 'the lockout must not touch the chat');
  } finally { stop(s); }
});

test('changing X-Forwarded-For on every guess still hits a shared cap', async () => {
  const s = await startServer({ ADMIN_PASSWORD: PASSWORD });
  try {
    for (let i = 0; i < 100; i++) {
      const r = await fetch(s.base + '/api/qa', { headers: { authorization: basic('admin', 'guess' + i), 'x-forwarded-for': `10.0.${i >> 8}.${i & 255}` } });
      assert.strictEqual(r.status, 401, `guess ${i + 1}`);
    }
    const next = await fetch(s.base + '/api/qa', { headers: { authorization: basic('admin', 'guess-x'), 'x-forwarded-for': '10.9.9.9' } });
    assert.strictEqual(next.status, 429);
  } finally { stop(s); }
});

test('with no ADMIN_PASSWORD set the editor is closed, not open', async () => {
  const s = await startServer({});
  try {
    for (const url of ['/admin.html', '/api/qa']) {
      const res = await fetch(s.base + url, { headers: { authorization: basic('admin', '') } });
      assert.strictEqual(res.status, 503, url);
      assert.match(await res.text(), /ADMIN_PASSWORD/);
    }
    const home = await fetch(s.base + '/');
    assert.strictEqual(home.status, 200, 'the chat page still works');
  } finally { stop(s); }
});
