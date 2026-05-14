// Flashcards Generator — folosește Groq API (OpenAI-compatible) pentru a extrage
// flashcards (Q/A) dintr-o notiță. Mai apoi se aplică SM-2 client-side pentru
// repetiție spațială.
import { AppError } from '../middleware/errorHandler.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const TARGET_CARDS = 12;

export async function generateFlashcards(noteContent, noteTitle, subject) {
  if (!noteContent) throw new AppError('Notiță goală', 400);

  const contentPreview = noteContent.substring(0, 4000);

  const prompt = `
Ești un profesor de ${subject || 'materie'}. Bazat pe notița de mai jos, generează între 8 și ${TARGET_CARDS} flashcards (cartonașe) pentru învățare prin repetiție spațială.

NOTIȚĂ:
Titlu: ${noteTitle || 'Fără titlu'}
Conținut: ${contentPreview}

INSTRUCȚIUNI:
- Fiecare flashcard are "front" (întrebare scurtă sau termen) și "back" (răspuns scurt, esențial)
- Acoperă concepte cheie, definiții, formule, date importante
- "front" maxim 120 caractere, "back" maxim 300 caractere
- Variază tipul: definiții, "ce e X?", "care e diferența între A și B?", formule
- NU include numere de pagină sau referințe interne
- Limba: aceeași cu notița (probabil română)

RĂSPUNDE DOAR CU JSON (fără markdown, fără \`\`\` backticks):
{
  "cards": [
    { "front": "...", "back": "..." }
  ]
}
`;

  let response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHATBOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.6,
      }),
    });
  } catch (fetchErr) {
    console.error('Groq fetch error:', fetchErr.message);
    throw new AppError('Nu am putut contacta serviciul AI. Încearcă din nou.', 500);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new AppError('AI service rate limit. Încearcă din nou în câteva minute.', 429);
    }
    const body = await response.json().catch(() => ({}));
    console.error('Groq API error:', response.status, body);
    throw new AppError('Eroare la serviciul AI. Încearcă din nou mai târziu.', 500);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content?.trim();
  if (!responseText) throw new AppError('Răspuns gol de la AI', 500);

  let parsed;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (parseErr) {
    console.error('JSON parse error:', responseText);
    throw new AppError('Răspunsul de la AI nu e valid JSON', 500);
  }

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new AppError('Structură flashcards nevalidă', 500);
  }

  // Filtrăm/curățăm.
  const cards = parsed.cards
    .map(c => ({
      front: String(c.front || '').trim().slice(0, 200),
      back:  String(c.back  || '').trim().slice(0, 600),
    }))
    .filter(c => c.front.length >= 3 && c.back.length >= 1)
    .slice(0, TARGET_CARDS);

  if (cards.length === 0) {
    throw new AppError('AI nu a returnat flashcards utile pentru această notiță', 500);
  }

  return { cards };
}

// SM-2 — calculează noul state al cardului în funcție de quality (0-5).
// Standard: 0-2 = răspuns greșit (resetăm), 3-5 = corect.
// Simplificăm UI-ul cu 4 butoane: Again=2, Hard=3, Good=4, Easy=5.
export function applySM2(card, quality) {
  let easeFactor = card.easeFactor ?? 2.5;
  let repetitions = card.repetitions ?? 0;
  let interval = card.interval ?? 0;

  if (quality < 3) {
    repetitions = 0;
    interval = 1; // reia mâine
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    dueDate,
    lastReviewedAt: new Date(),
  };
}
