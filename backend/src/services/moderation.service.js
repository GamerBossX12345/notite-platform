// AI moderation — verifică dacă un raport este legitim înainte de a fi trimis adminului.
// Folosește MODERATION_API_KEY (Groq).
import { AppError } from '../middleware/errorHandler.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const REASON_LABELS = {
  PLAGIAT: 'Plagiat (conținut copiat de la altcineva)',
  CONTINUT_NEPOTRIVIT: 'Conținut nepotrivit sau ofensator',
  SPAM: 'Spam sau conținut irelevant',
  ALTUL: 'Alt motiv',
};

// Returnează { verdict: 'VALID'|'INVALID'|'UNCERTAIN', text: string }
// Dacă apelul AI eșuează, returnează null (raportul e salvat oricum).
export async function moderateReport({ noteTitle, noteContent, noteSubject, fileText, reason, details }) {
  const reasonLabel = REASON_LABELS[reason] || reason;
  const contentSnippet = (noteContent || '').substring(0, 1500);
  const fileSnippet = (fileText || '').substring(0, 2500);

  const prompt = `Ești un sistem de moderare pentru o platformă educațională românească.
Un utilizator a raportat o notiță. Trebuie să evaluezi dacă raportul este legitim.

NOTIȚĂ RAPORTATĂ:
- Titlu: ${noteTitle}
- Materie: ${noteSubject || 'necunoscută'}
- Conținut (extras): ${contentSnippet || '(fără conținut text)'}${fileSnippet ? `
- Conținutul fișierului atașat (extras din document/imagine): ${fileSnippet}` : ''}

RAPORT:
- Motiv: ${reasonLabel}
- Detalii oferite de utilizator: ${details || '(niciun detaliu)'}

INSTRUCȚIUNI:
Evaluează dacă raportul este justificat. Ia în considerare:
- Pentru PLAGIAT: conținutul pare copiat/duplicat? Există indicii?
- Pentru SPAM: conținutul e irelevant sau promoțional?
- Pentru CONTINUT_NEPOTRIVIT: există conținut ofensator, dăunător sau inadecvat pentru o platformă educațională?
- Cât de credibili par detaliile oferite de utilizator?

RĂSPUNDE STRICT CU JSON (fără text în afara JSON-ului):
{
  "verdict": "VALID" | "INVALID" | "UNCERTAIN",
  "text": "Explicație scurtă (1-2 propoziții) pentru decizia ta"
}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MODERATION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    const verdict = ['VALID', 'INVALID', 'UNCERTAIN'].includes(parsed.verdict)
      ? parsed.verdict
      : 'UNCERTAIN';

    return { verdict, text: parsed.text || '' };
  } catch (err) {
    console.error('Moderation service error:', err.message);
    return null;
  }
}
