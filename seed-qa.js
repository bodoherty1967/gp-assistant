/**
 * seed-qa.js — Parse KB_Portal_Functionality.html → kb-qa.json
 * Run: node seed-qa.js
 */

const fs   = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'KB_Portal_Functionality.html');
const outPath  = path.join(__dirname, 'kb-qa.json');

const html = fs.readFileSync(htmlPath, 'utf8');

function strip(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract categories by matching <h2> tags
const catMatches = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)];
const cats = catMatches.map(m => ({ pos: m.index, name: strip(m[1]) }));

function categoryAt(pos) {
  let cat = 'General';
  for (const c of cats) {
    if (c.pos < pos) cat = c.name;
    else break;
  }
  return cat;
}

// Extract all q-blocks
const blockRe = /<div class="q-block[^"]*">([\s\S]*?)<\/div>\s*\n\s*<\/div>/g;
const results = [];

for (const match of html.matchAll(blockRe)) {
  const block = match[0];
  const pos   = match.index;

  const numM    = block.match(/<div class="q-num">([\s\S]*?)<\/div>/);
  const textM   = block.match(/<div class="q-text">([\s\S]*?)<\/div>/);
  const answerM = block.match(/<div class="q-answer">([\s\S]*?)<\/div>/);

  if (!textM) continue;

  const qText = strip(textM[1]);
  if (!qText || qText === '—') continue;  // blank placeholder

  let rawAnswer = answerM ? answerM[1] : '';
  // Strip badge spans (e.g. <span class="badge badge-draft">DRAFT</span>)
  rawAnswer = rawAnswer.replace(/<span class="badge[^"]*">[\s\S]*?<\/span>/g, '');
  const qAnswer = strip(rawAnswer);

  // Skip "BLANK" placeholders
  if (qAnswer.includes('BLANK') || qAnswer.includes('blank in the original')) continue;

  const qNum = numM ? strip(numM[1]) : '';
  const id = 'q' + qNum.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '_' + results.length;

  results.push({
    id,
    category: categoryAt(pos),
    question: qText,
    answer: qAnswer,
    status: qAnswer ? 'draft' : 'needs-input',
    createdAt: new Date().toISOString()
  });
}

// Deduplicate by question text
const seen = new Set();
const deduped = results.filter(q => {
  if (seen.has(q.question)) return false;
  seen.add(q.question);
  return true;
});

fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));

const answered = deduped.filter(q => q.answer && q.answer.trim()).length;
console.log(`✓ Seeded ${deduped.length} questions`);
console.log(`  ${answered} with draft answers`);
console.log(`  ${deduped.length - answered} need input`);
console.log(`  Output: ${outPath}`);
