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

// Screenshots: stored on persistent disk alongside kb-qa.json
const SCREENSHOTS_DIR = process.env.KB_QA_PATH
  ? path.join(path.dirname(process.env.KB_QA_PATH), 'screenshots')
  : path.join(__dirname, 'public', 'screenshots');

// Serve uploaded screenshots as static files
app.use('/screenshots', (req, res, next) => {
  express.static(SCREENSHOTS_DIR)(req, res, next);
});

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
      '\n\n---\n\n## VERIFIED Q&A — USE THESE ANSWERS EXACTLY\n\n' +
      'IMPORTANT: The following Q&A pairs have been verified by the GigPost team and are the authoritative answers. ' +
      'When a user asks a question that matches or closely relates to one of these, respond using THIS answer — not the base document above. ' +
      'Do not summarise, shorten, or rewrite these answers. Use them as written.\n\n' +
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

// ── image upload ─────────────────────────────────────────────────────────────────

app.post('/api/upload-image', (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'string') return res.status(400).json({ error: 'No image data' });

  const match = data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });

  const mime = match[1];                           // e.g. image/png
  const ext  = mime.split('/')[1].replace('+', ''); // png, jpeg, gif, webp
  const buf  = Buffer.from(match[2], 'base64');

  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const filename = `img-${Date.now()}.${ext}`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  fs.writeFileSync(filepath, buf);

  res.json({ ok: true, url: `/screenshots/${filename}` });
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

  const body = JSON.stringify({ model: 'tts-1', voice: 'nova', input: plain, speed: 0.92 });

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

// ── KB exact matching ───────────────────────────────────────────────────────────

function tokenize(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

function jaccardSimilarity(q1, q2) {
  const a = tokenize(q1);
  const b = tokenize(q2);
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function findBestKBMatch(question, qa) {
  let best = null;
  let bestScore = 0;
  for (const entry of qa) {
    if (!entry.answer || !entry.answer.trim()) continue;
    const score = jaccardSimilarity(question, entry.question);
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  // Require at least 35% word overlap to trust the match
  return bestScore >= 0.35 ? best : null;
}

// ── chat ────────────────────────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY configured' });

  // ── Step 1: Try to find an exact KB match and return it verbatim ──────────────
  const qa = loadQA().filter(q => q.answer && q.answer.trim());
  const kbMatch = findBestKBMatch(message, qa);
  if (kbMatch) {
    console.log(`[chat] KB match found (id=${kbMatch.id}) — returning verbatim answer`);
    return res.json({ reply: kbMatch.answer });
  }

  // ── Step 2: No strong KB match — fall through to GPT ────────────────────────
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
