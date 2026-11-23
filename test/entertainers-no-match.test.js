// Entertainer mode with no verified answer must not fall to GPT.
// GPT's only document is GigPost_Assistant_Knowledge.md, which is written for venues, so a band
// asking "How do I schedule my posts?" got venue steps (+ Add Event, Choose Entertainer(s)).
// Sticks spec v5 A.2.3: "Do not surface venue portal procedures ... in this mode."
// No embeddings file here, so the matcher finds nothing without calling OpenAI.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.join(__dirname, '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

let child; let dir; let base;
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-ent-'));
  fs.writeFileSync(path.join(dir, 'kb-qa.json'), JSON.stringify([
    { id: 'e1', question: 'Can I message venues?', answer: 'Yes, from Community.', category: 'General', audience: ['entertainers'] },
    { id: 's1', question: 'Is my venue\'s data private?', answer: 'Yes.', category: 'General', audience: ['shared'] },
  ]));
  const port = await freePort();
  child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    // A key that is not real: if this test ever reaches GPT, OpenAI refuses it and the test fails.
    env: { PATH: process.env.PATH, PORT: String(port), KB_QA_PATH: path.join(dir, 'kb-qa.json'), OPENAI_KEY: 'sk-test-not-a-real-key', ADMIN_PASSWORD: 'x' },
    stdio: 'ignore',
  });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/'); return; } catch (e) { await new Promise(r => setTimeout(r, 50)); }
  }
  throw new Error('server did not start');
});
after(() => { if (child) child.kill(); fs.rmSync(dir, { recursive: true, force: true }); });

const ask = (message, mode) => fetch(base + '/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history: [], mode }),
}).then(async r => ({ status: r.status, body: await r.json() }));

test('entertainers, no verified answer: an honest "no answer yet" and the email, no GPT', async () => {
  const r = await ask('How do I schedule my posts?', 'entertainers');
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.reply, /hello@mygigpost\.com/);
  assert.doesNotMatch(r.body.reply, /Add Event|Entertainers tab|venue/i, 'nothing written for venues');
});

test('general mode is unchanged: pinned facts and Get in Touch', async () => {
  const r = await ask('How do I schedule my posts?', 'general');
  assert.strictEqual(r.status, 200);
  assert.match(r.body.reply, /^Here's what I can tell you about GigPost:/);
  assert.match(r.body.reply, /Get in Touch/);
});
