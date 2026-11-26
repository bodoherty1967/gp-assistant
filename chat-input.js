// What /chat accepts from its caller. The history goes into the GPT messages, so only user and
// assistant turns with string content are kept: a caller-written "system" turn would otherwise sit
// next to the real system prompt. Same limits as the GigPost proxy, so its requests are unchanged.
const MESSAGE_MAX = 2000;   // the widget allows 500; the test page has no limit
const HISTORY_TURNS = 10;
const TURN_MAX = 4000;      // an assistant reply runs to about 800 tokens

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, TURN_MAX) }));
}

module.exports = { cleanHistory, MESSAGE_MAX, HISTORY_TURNS, TURN_MAX };
