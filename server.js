const express = require('express');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');

const app = express();
app.use(express.json({ limit: '15mb' }));
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

// Embeddings: stored alongside kb-qa.json
const EMBEDDINGS_PATH = process.env.KB_QA_PATH
  ? path.join(path.dirname(process.env.KB_QA_PATH), 'kb-embeddings.json')
  : path.join(__dirname, 'kb-embeddings.json');

// Embedding matching config
const EMBED_THRESHOLD = 0.82;   // minimum cosine similarity to consider a match
const EMBED_MARGIN    = 0.08;   // top match must beat 2nd-best by this much

// Serve uploaded screenshots as static files
app.use('/screenshots', (req, res, next) => {
  express.static(SCREENSHOTS_DIR)(req, res, next);
});

// ── helpers ───────────────────────────────────────────────────────────────────

function loadQA() {
  if (!fs.existsSync(KB_QA_PATH)) return [];
  let qa;
  try { qa = JSON.parse(fs.readFileSync(KB_QA_PATH, 'utf8')); }
  catch (e) { console.error('kb-qa.json parse error:', e.message); return []; }
  // One-time migration: assign stable qNum to any entries that lack one
  const maxNum = qa.reduce((m, q) => Math.max(m, q.qNum || 0), 0);
  let changed = false;
  let next = maxNum + 1;
  qa.forEach(q => { if (!q.qNum) { q.qNum = next++; changed = true; } });
  if (changed) saveQA(qa);
  return qa;
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
  const qa2 = loadQA();
  const nextNum = qa2.reduce((m, q) => Math.max(m, q.qNum || 0), 0) + 1;
  const id  = 'q' + Date.now();
  const entry = {
    id,
    qNum: nextNum,
    category: (category || 'General').trim(),
    question: question.trim(),
    answer:   (answer || '').trim(),
    status:   answer && answer.trim() ? 'verified' : 'needs-input',
    createdAt: new Date().toISOString()
  };
  qa.push(entry);
  saveQA(qa);
  res.json({ ok: true, entry });
  // Compute embedding in background (don't block the response)
  const apiKey = process.env.OPENAI_KEY;
  if (apiKey) embedEntry(entry, apiKey).catch(() => {});
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
  // Re-embed if the question text changed
  const apiKey = process.env.OPENAI_KEY;
  if (apiKey) embedEntry(updated, apiKey).catch(() => {});
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

// ── Embeddings helpers ───────────────────────────────────────────────────────

function loadEmbeddings() {
  if (!fs.existsSync(EMBEDDINGS_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf8')); }
  catch (e) { console.error('kb-embeddings.json parse error:', e.message); return {}; }
}

function saveEmbeddings(embs) {
  const dir = path.dirname(EMBEDDINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(embs));
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function openaiEmbed(text, apiKey) {
  const body = JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 2000) });
  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, r => {
      let raw = '';
      r.on('data', c => raw += c);
      r.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  if (!data.data || !data.data[0]) throw new Error('Embedding API error: ' + JSON.stringify(data));
  return data.data[0].embedding;
}

// Find best KB match using semantic embeddings.
// Returns { entry, score } or null.
// Safety rule: top score must clear EMBED_THRESHOLD *and* beat 2nd-best by EMBED_MARGIN.
async function findBestKBMatchEmbed(question, qa, apiKey) {
  const embeddings = loadEmbeddings();
  const candidates = qa.filter(q => q.answer && q.answer.trim() && embeddings[q.id]);
  if (candidates.length === 0) return null;

  const qEmbed = await openaiEmbed(question, apiKey);

  const scored = candidates
    .map(entry => ({ entry, score: cosine(qEmbed, embeddings[entry.id]) }))
    .sort((a, b) => b.score - a.score);

  const top    = scored[0];
  const second = scored[1];

  // Must clear threshold
  if (top.score < EMBED_THRESHOLD) return null;
  // Must beat runner-up by a safe margin (guards near-twin questions)
  if (second && (top.score - second.score) < EMBED_MARGIN) return null;

  return top;
}

// Compute + store embedding for a single QA entry (fire-and-forget on save)
async function embedEntry(entry, apiKey) {
  if (!entry.question) return;
  try {
    const embs = loadEmbeddings();
    embs[entry.id] = await openaiEmbed(entry.question, apiKey);
    saveEmbeddings(embs);
  } catch (e) {
    console.error(`[embed] Failed for ${entry.id}:`, e.message);
  }
}

// ── chat ────────────────────────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY configured' });

  // ── Step 1: Semantic KB match — return verbatim if confident ─────────────────
  const qa = loadQA().filter(q => q.answer && q.answer.trim());
  try {
    const kbMatch = await findBestKBMatchEmbed(message, qa, apiKey);
    if (kbMatch) {
      console.log(`[chat] Embed match id=${kbMatch.entry.id} score=${kbMatch.score.toFixed(3)} — verbatim`);
      return res.json({ reply: kbMatch.entry.answer });
    }
  } catch (e) {
    console.error('[chat] Embed match error (falling through to GPT):', e.message);
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

// ── Embed backfill ────────────────────────────────────────────────────────────
// POST /api/embed-all  — one-time job to embed all existing questions
// Call once after deploy; subsequent saves auto-embed.
app.get('/api/embed-status', (req, res) => {
  const qa   = loadQA().filter(q => q.answer && q.answer.trim());
  const embs = loadEmbeddings();
  const embedded = qa.filter(q => embs[q.id]).length;
  res.json({ total: qa.length, embedded, missing: qa.length - embedded });
});

app.post('/api/embed-all', async (req, res) => {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY' });
  const qa   = loadQA().filter(q => q.question && q.answer && q.answer.trim());
  const embs = loadEmbeddings();
  const todo = qa.filter(q => !embs[q.id]);
  if (todo.length === 0) return res.json({ ok: true, embedded: 0, message: 'All already embedded' });

  res.json({ ok: true, total: todo.length, message: `Embedding ${todo.length} questions in background…` });

  // Process sequentially to avoid rate limits
  let done = 0;
  for (const entry of todo) {
    try {
      const fresh = loadEmbeddings();
      fresh[entry.id] = await openaiEmbed(entry.question, apiKey);
      saveEmbeddings(fresh);
      done++;
      if (done % 10 === 0) console.log(`[embed-all] ${done}/${todo.length}`);
      await new Promise(r => setTimeout(r, 120)); // ~8 req/s, well within rate limit
    } catch (e) {
      console.error(`[embed-all] Failed ${entry.id}:`, e.message);
    }
  }
  console.log(`[embed-all] Done: ${done}/${todo.length}`);
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
