// /tts turns any text into paid OpenAI speech. It had no key check, no rate limit and no length cap,
// so anyone who knew the address could spend the OpenAI account on it. It now has the same caller
// key and per-address limit as /chat, and refuses text longer than OpenAI's own 4096-character cap
// before any call is made. Every request below is refused before OpenAI, so no network is needed.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.join(__dirname, '..');
const KEY = 'k-tts-0123456789abcdef';
const running = [];

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}
async function start(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-tts-'));
  fs.writeFileSync(path.join(dir, 'kb-qa.json'), '[]');
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { PATH: process.env.PATH, PORT: String(port), KB_QA_PATH: path.join(dir, 'kb-qa.json'), OPENAI_KEY: 'sk-test-not-a-real-key', ...env }, stdio: 'ignore' });
  running.push({ child, dir });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/'); return base; } catch (e) { await new Promise(r => setTimeout(r, 50)); }
  }
  throw new Error('server did not start');
}
after(() => { for (const r of running) { r.child.kill(); fs.rmSync(r.dir, { recursive: true, force: true }); } });

const tts = (base, text, headers = {}) => fetch(base + '/tts', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify({ text }),
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

test('with ASSISTANT_KEY set, /tts without the key is 401', async () => {
  const base = await start({ ASSISTANT_KEY: KEY });
  assert.strictEqual((await tts(base, 'hello')).status, 401);
  assert.strictEqual((await tts(base, 'hello', { 'x-assistant-key': 'wrong' })).status, 401);
  // the right key gets past the gate; text over the cap still stops it before OpenAI
  assert.strictEqual((await tts(base, 'x'.repeat(4097), { 'x-assistant-key': KEY })).status, 400);
});

test('/tts refuses text that is not a string or is over 4096 characters', async () => {
  const base = await start({});
  assert.strictEqual((await tts(base, 'x'.repeat(4097))).status, 400);
  assert.strictEqual((await tts(base, { a: 1 })).status, 400);
  assert.strictEqual((await tts(base, '')).status, 400);
});

test('/tts allows 20 requests a minute from one address, then 429', async () => {
  const base = await start({});
  const long = 'x'.repeat(4097); // refused with 400, so no OpenAI call, but it still counts
  for (let i = 0; i < 20; i++) assert.strictEqual((await tts(base, long, { 'x-forwarded-for': '203.0.113.7' })).status, 400, `request ${i + 1}`);
  assert.strictEqual((await tts(base, long, { 'x-forwarded-for': '203.0.113.7' })).status, 429);
  assert.strictEqual((await tts(base, long, { 'x-forwarded-for': '203.0.113.8' })).status, 400, 'another address has its own allowance');
});
