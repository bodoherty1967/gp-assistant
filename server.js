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

// Audit log: append-only record of every KB change
const AUDIT_LOG_PATH = process.env.KB_QA_PATH
  ? path.join(path.dirname(process.env.KB_QA_PATH), 'audit.jsonl')
  : path.join(__dirname, 'audit.jsonl');

// Embedding matching config
const EMBED_THRESHOLD = 0.75;   // minimum cosine similarity to consider a match
const EMBED_MARGIN    = 0.08;   // top match must beat 2nd-best by this much

// ── Rate limiting (IP-based, /chat only) ─────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX       = 20;        // requests per window
const rateLimitMap = new Map();         // ip → { count, resetAt }

function rateLimitMiddleware(req, res, next) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }
  next();
}

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

function appendAudit(action, entryId, changes) {
  try {
    const record = JSON.stringify({
      ts: new Date().toISOString(),
      action,       // 'create' | 'update' | 'delete'
      id: entryId,
      changes       // object: { field: { from, to } } for update; full entry for create/delete
    });
    fs.appendFileSync(AUDIT_LOG_PATH, record + '\n');
  } catch (e) {
    console.error('[audit] Failed to write:', e.message);
  }
}

// ── Audience helpers ──────────────────────────────────────────────────────────
// Returns true if a Q&A is eligible to match in the given mode.
// A Q&A is eligible if its audience array includes 'shared' OR the mode itself.
// If a Q&A has no audience field (legacy/untagged), it defaults to ['portal'].
// 'shared' always wins: shared + any surface = visible everywhere.
function audienceMatchesMode(entry, mode) {
  const aud = Array.isArray(entry.audience) && entry.audience.length > 0
    ? entry.audience
    : ['portal']; // safe default for untagged (legacy portal Q&As)
  return aud.includes('shared') || aud.includes(mode);
}

// Pinned facts for general mode no-match fallback.
// Pulled from shared Q&As at runtime so wording stays in sync.
// Falls back to safe static text if shared Q&As not yet seeded.
function getPinnedFacts() {
  const qa = loadQA();
  const shared = qa.filter(q =>
    q.answer && q.answer.trim() &&
    Array.isArray(q.audience) && q.audience.includes('shared')
  );
  if (shared.length > 0) {
    return shared.map(q => `- ${q.question}\n  ${q.answer}`).join('\n\n');
  }
  // Static fallback (used before shared Q&As are seeded)
  return [
    '- What is GigPost?\n  GigPost is a social media posting platform built for live music venues and the entertainers who perform at them. It automates Facebook and Instagram posts for every show, special event, and house event.',
    '- How much does GigPost cost?\n  $39/month — unlimited posts, all event types, 30-day free trial with no card required. After the trial, posting pauses and nothing is charged if you do not subscribe.',
    '- Is there a free trial?\n  Yes — 30 days free, no credit card required upfront. After the trial it\'s $39/month. Cancel anytime, no contracts.'
  ].join('\n\n');
}

const SYSTEM_PROMPTS = {
  portal: (base, qaSection) =>
    `You are the GigPost portal assistant. You help venue owners and bar managers understand how to use the GigPost portal.

Your answers must be based ONLY on the information in the knowledge document below. Do not speculate, invent features, or answer questions about topics outside GigPost portal functionality.

If someone asks something you don't have information about, say: "I don't have information on that — for account-specific questions or issues, please contact GigPost support at support@mygigpost.com."

Facebook login, Facebook Page access, and connecting a Facebook Page are IN SCOPE — they are required steps for using GigPost. Answer those questions using the KB. Only refuse when the question has nothing to do with GigPost or its setup requirements (e.g. sports, recipes, unrelated tech).

Keep answers concise and practical. Use plain language — these are bar owners, not tech experts. Use bullet points when listing steps. Don't start with phrases like "Great question!" or "Certainly!".

--- KNOWLEDGE DOCUMENT ---
${base}${qaSection}
--- END KNOWLEDGE DOCUMENT ---`,

  general: (base, qaSection, pinnedFacts) =>
    `You are the GigPost homepage assistant. You answer general questions about GigPost for venues and entertainers visiting mygigpost.com.

Your answers must be based ONLY on the verified Q&A pairs below. Do not speculate or invent features.

If a question is not covered by the Q&A below, respond ONLY with these pinned facts followed by the contact prompt. Do not refuse, do not say you cannot help — just provide the facts and the next step:

--- PINNED FACTS (always accurate, use verbatim) ---
${pinnedFacts}
---

After the pinned facts, always add: "Still have questions? Click 'Get in Touch' at the bottom of this page to email us at hello@mygigpost.com."

Keep answers concise and conversational. Plain language — bar owners and musicians, not tech experts. Bullet points when listing steps or features. Don't start with "Great question!" or "Certainly!".

--- KNOWLEDGE DOCUMENT ---
${base}${qaSection}
--- END KNOWLEDGE DOCUMENT ---`,

  entertainers: (base, qaSection) =>
    `You are the GigPost assistant for entertainers and bands. You help musicians, DJs, and solo acts understand how GigPost works for them — their profile, how venues promote their shows, and what's available.

Your answers must be based ONLY on the information in the knowledge document below. Do not speculate, invent features, or answer questions outside of GigPost's scope.

If someone asks something you don't have information about, say: "I don't have that info yet — click 'Get in Touch' to reach the GigPost team directly at hello@mygigpost.com."

Keep answers concise and conversational. Use plain language — working musicians, not tech experts. Bullet points when listing steps. Don't start with "Great question!" or "Certainly!".

--- KNOWLEDGE DOCUMENT ---
${base}${qaSection}
--- END KNOWLEDGE DOCUMENT ---`
};

function buildSystemPrompt(mode) {
  const base = fs.readFileSync(KB_BASE_PATH, 'utf8');
  // Only include Q&As eligible for this mode
  const qa = loadQA()
    .filter(q => q.answer && q.answer.trim())
    .filter(q => audienceMatchesMode(q, mode));

  let qaSection = '';
  if (qa.length > 0) {
    qaSection =
      '\n\n---\n\n## VERIFIED Q&A — USE THESE ANSWERS EXACTLY\n\n' +
      'IMPORTANT: The following Q&A pairs have been verified by the GigPost team and are the authoritative answers. ' +
      'When a user asks a question that matches or closely relates to one of these, respond using THIS answer — not the base document above. ' +
      'Do not summarise, shorten, or rewrite these answers. Use them as written.\n\n' +
      qa.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
  }

  if (mode === 'general') {
    const pinnedFacts = getPinnedFacts();
    return SYSTEM_PROMPTS.general(base, qaSection, pinnedFacts);
  }
  const builder = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.portal;
  return builder(base, qaSection);
}

// ── Q&A admin API ─────────────────────────────────────────────────────────────

app.get('/api/qa', (req, res) => res.json(loadQA()));

app.post('/api/qa', (req, res) => {
  const { question, answer, category, audience } = req.body;
  if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required' });
  const qa = loadQA();
  const qa2 = loadQA();
  const nextNum = qa2.reduce((m, q) => Math.max(m, q.qNum || 0), 0) + 1;
  const id  = 'q' + Date.now();
  // Default audience to ['portal'] — safe default, never invisible
  const resolvedAudience = Array.isArray(audience) && audience.length > 0 ? audience : ['portal'];
  const entry = {
    id,
    qNum: nextNum,
    category: (category || 'General').trim(),
    question: question.trim(),
    answer:   (answer || '').trim(),
    audience: resolvedAudience,
    status:   answer && answer.trim() ? 'verified' : 'needs-input',
    createdAt: new Date().toISOString()
  };
  qa.push(entry);
  saveQA(qa);
  appendAudit('create', id, { entry });
  res.json({ ok: true, entry });
  // Compute embedding in background (don't block the response)
  const apiKey = process.env.OPENAI_KEY;
  if (apiKey) embedEntry(entry, apiKey).catch(() => {});
});

app.put('/api/qa/:id', (req, res) => {
  const qa  = loadQA();
  const idx = qa.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const before = { ...qa[idx] };
  const updated = {
    ...qa[idx],
    ...req.body,
    id: qa[idx].id,
    updatedAt: new Date().toISOString()
  };
  // Guard: audience must always be a non-empty array
  if (!Array.isArray(updated.audience) || updated.audience.length === 0) {
    updated.audience = before.audience && before.audience.length ? before.audience : ['portal'];
  }
  if (!req.body.status) {
    updated.status = updated.answer && updated.answer.trim() ? 'verified' : 'needs-input';
  }
  // Build audit diff
  const changes = {};
  for (const k of ['question', 'answer', 'category', 'audience', 'status']) {
    if (JSON.stringify(before[k]) !== JSON.stringify(updated[k])) {
      changes[k] = { from: before[k], to: updated[k] };
    }
  }
  qa[idx] = updated;
  saveQA(qa);
  if (Object.keys(changes).length) appendAudit('update', updated.id, changes);
  res.json({ ok: true, entry: updated });
  // Re-embed if the question text changed
  const apiKey = process.env.OPENAI_KEY;
  if (apiKey) embedEntry(updated, apiKey).catch(() => {});
});

app.delete('/api/qa/:id', (req, res) => {
  let qa = loadQA();
  const target = qa.find(q => q.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  qa = qa.filter(q => q.id !== req.params.id);
  saveQA(qa);
  appendAudit('delete', target.id, { entry: target });
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

// ── Audit log read ────────────────────────────────────────────────────────────
app.get('/api/audit', (req, res) => {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return res.json([]);
  try {
    const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const records = lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
    res.json(records.reverse()); // newest first
  } catch (e) {
    res.status(500).json({ error: 'Could not read audit log' });
  }
});

// ── chat ────────────────────────────────────────────────────────────────────────

app.post('/chat', rateLimitMiddleware, async (req, res) => {
  const { message, history, mode } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No OPENAI_KEY configured' });

  const { debug } = req.body;
  const resolvedMode = ['portal', 'general', 'entertainers'].includes(mode) ? mode : 'portal';

  // ── Step 1: Semantic KB match (audience-filtered) — return verbatim if confident ──
  const allQA = loadQA().filter(q => q.answer && q.answer.trim());
  const qa    = allQA.filter(q => audienceMatchesMode(q, resolvedMode));
  try {
    const kbMatch = await findBestKBMatchEmbed(message, qa, apiKey);
    if (kbMatch) {
      console.log(`[chat] Embed match id=${kbMatch.entry.id} score=${kbMatch.score.toFixed(3)} mode=${resolvedMode} — verbatim`);
      const payload = { reply: kbMatch.entry.answer };
      if (debug) payload._debug = { mode: resolvedMode, matchedQuestion: kbMatch.entry.question, matchedId: kbMatch.entry.id, score: +kbMatch.score.toFixed(4) };
      return res.json(payload);
    }
  } catch (e) {
    console.error('[chat] Embed match error (falling through):', e.message);
  }

  // ── Step 1b: General mode no-match → pinned facts + CTA (never GPT speculation) ──
  if (resolvedMode === 'general') {
    const pinnedFacts = getPinnedFacts();
    const reply = `Here's what I can tell you about GigPost:\n\n${pinnedFacts}\n\nStill have questions? Click "Get in Touch" at the bottom of this page to email us at hello@mygigpost.com.`;
    const payload = { reply };
    if (debug) payload._debug = { mode: resolvedMode, matchedQuestion: null, matchedId: null, pinnedFallback: true };
    return res.json(payload);
  }

  // ── Step 2: No strong KB match — fall through to GPT ────────────────────────
  const systemPrompt = buildSystemPrompt(resolvedMode);

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
