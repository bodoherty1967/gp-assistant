// With ASSISTANT_KEY set, /chat answers only callers that send it as x-assistant-key (the GigPost
// server). Without it anyone who knows this address can call /chat directly, around GigPost's
// rate limits, and in portal mode every unmatched question is a paid GPT call.
// Unset, /chat stays open exactly as before, so deploying this changes nothing until the key is set.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.join(__dirname, '..');
const KEY = 'k-0123456789abcdef';
const running = [];

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}
async function start(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-key-'));
  fs.writeFileSync(path.join(dir, 'kb-qa.json'), '[]');
  const port = await freePort();
  // general mode with no match returns pinned facts without calling OpenAI, so no network is needed
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { PATH: process.env.PATH, PORT: String(port), KB_QA_PATH: path.join(dir, 'kb-qa.json'), OPENAI_KEY: 'sk-test-not-a-real-key', ...env }, stdio: 'ignore' });
  running.push({ child, dir });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/'); return base; } catch (e) { await new Promise(r => setTimeout(r, 50)); }
  }
  throw new Error('server did not start');
}
after(() => { for (const r of running) { r.child.kill(); fs.rmSync(r.dir, { recursive: true, force: true }); } });

const chat = (base, headers = {}) => fetch(base + '/chat', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify({ message: 'hi', history: [], mode: 'general' }),
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

test('with ASSISTANT_KEY set: no key or a wrong key is 401, the right key is answered', async () => {
  const base = await start({ ASSISTANT_KEY: KEY });
  assert.strictEqual((await chat(base)).status, 401);
  assert.strictEqual((await chat(base, { 'x-assistant-key': 'wrong' })).status, 401);
  const ok = await chat(base, { 'x-assistant-key': KEY });
  assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
  assert.match(ok.body.reply, /GigPost/);
});

test('a refused caller does not use up the rate limit of the real caller', async () => {
  const base = await start({ ASSISTANT_KEY: KEY });
  for (let i = 0; i < 25; i++) await chat(base, { 'x-forwarded-for': '198.51.100.7' });
  const r = await chat(base, { 'x-assistant-key': KEY, 'x-forwarded-for': '198.51.100.7' });
  assert.strictEqual(r.status, 200);
});

test('without ASSISTANT_KEY: /chat is open as before', async () => {
  const base = await start({});
  assert.strictEqual((await chat(base)).status, 200);
});

test('the page and the screenshots stay open with the key set', async () => {
  const base = await start({ ASSISTANT_KEY: KEY });
  assert.strictEqual((await fetch(base + '/')).status, 200);
  assert.notStrictEqual((await fetch(base + '/screenshots/img-1.png')).status, 401);
});
