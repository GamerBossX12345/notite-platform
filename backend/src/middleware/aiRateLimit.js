// Rate limit pentru funcțiile AI, pe utilizator, fereastră glisantă de 1h.
// Simplu, în memorie — suficient pentru o singură instanță. Dacă scalăm la mai
// multe procese, mutăm în DB sau Redis.

const WINDOW_MS = 60 * 60 * 1000; // 1 oră

// hits.get(userId) → { quiz: number[], chat: number[] } (timestamps în ms)
const hits = new Map();

function prune(timestamps, now) {
  // Tăiem timestampurile mai vechi decât fereastra.
  const cutoff = now - WINDOW_MS;
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) i++;
  if (i > 0) timestamps.splice(0, i);
  return timestamps;
}

function buckets(userId, kind) {
  let b = hits.get(userId);
  if (!b) {
    b = {};
    hits.set(userId, b);
  }
  if (!b[kind]) b[kind] = [];
  return b;
}

function makeLimiter(kind, max, friendly) {
  return function aiRateLimit(req, res, next) {
    const userId = req.user?.id;
    if (!userId) return next(); // requireAuth ar trebui să blocheze înainte
    const now = Date.now();
    const b = buckets(userId, kind);
    prune(b[kind], now);

    if (b[kind].length >= max) {
      const oldest = b[kind][0];
      const resetMs = oldest + WINDOW_MS - now;
      const minutes = Math.max(1, Math.ceil(resetMs / 60000));
      res.set('Retry-After', Math.ceil(resetMs / 1000));
      return res.status(429).json({
        error: `Ai atins limita de ${max} ${friendly} pe oră. Mai încearcă peste ~${minutes} min.`,
        code: 'AI_RATE_LIMIT',
        limit: max,
        retryAfterSec: Math.ceil(resetMs / 1000),
      });
    }
    b[kind].push(now);
    next();
  };
}

export const quizRateLimit = makeLimiter('quiz', 3, 'quizuri');
export const chatRateLimit = makeLimiter('chat', 5, 'replici AI');
export const flashcardsRateLimit = makeLimiter('flashcards', 2, 'generări de flashcards');
