const express = require('express');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── paths (env vars allow Render persistent disk override) ────────────────────
const KB_BASE_PATH = process.env.KB_BASE_PATH
  || path.join(__dirname, 'GigPost_Assistant_Knowledge.md');

const KB_QA_PATH = process.env.KB_QA_PATH
  || path.join(__dirname, 'kb-qa.json');

// ── helpers ───────────────────────────────────────────────────────────────────

function loadQA() {
  if (!fs.existsSync(KB_QA_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(KB_QA_PATH, 'utf8')); }
  catch (e) { console.error('kb-qa.json parse error:', e.message); return []; }
}

function saveQA(qa) {
  // Ensure directory exists (important for /data on Render)
  const dir = path.dirname(KB_QA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(KB_QA_PATH, JSON.stringify(qa, null, 2));
}

function buildSystemPrompt() {
  const base = fs.readFileSync(KB_BASE_PATH, 'utf8');
  const qa   = loadQA().filter(q => q.answer && q.answer.trim());

  let qaSection = '';
  if (qa.length > 0) {
    qaSection =
      '\n\n---\n\n## VERIFIED Q&A\n\n' +
      'The following answers have been verified by the GigPost team. ' +
      'Prefer these over anything in the base document above when they conflict.\n\n' +
      qa.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
  }

  return `You are the GigPost portal assistant. You help venue owners and bar managers understand how to use the GigPost portal.

Your answers must be based ONLY on the information in the knowledge document below. Do not speculate, invent features, or answer questions about topics outside GigPost portal functionality.

If someone asks something you don't have information about, say: "I don't have information on that — for account-specific questions or issues, please contact GigPost support at support@mygigpost.com."

If someone asks something completely unrelated to GigPost, say: "I can only help with questions about using the GigPost portal."

Keep answers concise and practical. Use plain language — these are bar owners, not tech experts. Use bullet points when listing steps. Don't start with phrases like "Great question!" or "Certainly!".

--- KNOWLEDGE DOCUMENT ---
${base}${qaSection}
--- END KNOWLEDGE DOCUMENT ---`;
}

// ── Q&A admin API ─────────────────────────────────────────────────────────────

app.get('/api/qa', (req, res) => res.json(loadQA()));

app.post('/api/qa', (req, res) => {
  const { question, answer, category } = req.body;
  if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required' });
  const qa = loadQA();
  const id  = 'q' + Date.now();
  const entry = {
    id,
    category: (category || 'General').trim(),
    question: question.trim(),
    answer:   (answer || '').trim(),
    status:   answer && answer.trim() ? 'verified' : 'needs-input',
    createdAt: new Date().toISOString()
  };
  qa.push(entry);
  saveQA(qa);
  res.json({ ok: true, entry });
});

app.put('/api/qa/:id', (req, res) => {
  const qa  = loadQA();
  const idx = qa.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = {
    ...qa[idx],
    ...req.body,
    id: qa[idx].id,
    updatedAt: new Date().toISOString()
  };
  if (!req.body.status) {
    updated.status = updated.answer && updated.answer.trim() ? 'verified' : 'needs-input';
  }
  qa[idx] = updated;
  saveQA(qa);
  res.json({ ok: true, entry: updated });
});

app.delete('/api/qa/:id', (req, res) => {
  let qa = loadQA();
  if (!qa.find(q => q.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  qa = qa.filter(q => q.id !== req.params.id);
  saveQA(qa);
  res.json({ ok: true });
});

app.get('/api/categories', (req, res) => {
  const cats = [...new Set(loadQA().map(q => q.category).filter(Boolean))].sort();
  res.json(cats);
});

// ── TTS ──────────────────────────────────────────────────────────────────────

app.post('/tts', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY configured' });

  // Strip markdown so it reads naturally
  const plain = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[-•]\s/g, '')
    .trim();

  const body = JSON.stringify({ model: 'tts-1', voice: 'nova', input: plain });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/audio/speech',
    method: 'POST',
    headers: {
      'Content-Type':   'application/json',
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req2 = https.request(options, (r) => {
    if (r.statusCode !== 200) {
      let err = '';
      r.on('data', c => err += c);
      r.on('end', () => {
        if (!res.headersSent) res.status(500).json({ error: 'TTS error from OpenAI' });
      });
      return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    r.pipe(res);
  });

  req2.on('error', (err) => {
    console.error('[tts error]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'TTS failed' });
  });

  req2.write(body);
  req2.end();
});

// ── chat ────────────────────────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY configured' });

  const systemPrompt = buildSystemPrompt();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message }
  ];

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 800,
    temperature: 0.3
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  try {
    const data = await new Promise((resolve, reject) => {
      const req2 = https.request(options, (r) => {
        let raw = '';
        r.on('data', c => raw += c);
        r.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error('Invalid JSON from OpenAI')); }
        });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error('[chat error]', err.message);
    res.status(500).json({ error: 'Something went wrong — try again.' });
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  const qa       = loadQA();
  const answered = qa.filter(q => q.answer && q.answer.trim()).length;
  console.log(`GigPost Assistant running on port ${PORT}`);
  console.log(`KB: ${answered}/${qa.length} questions answered`);
  console.log(`KB base: ${KB_BASE_PATH}`);
  console.log(`KB Q&A:  ${KB_QA_PATH}`);
});
