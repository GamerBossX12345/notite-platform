// AI Chat — răspunde la întrebările utilizatorului despre o notiță.
// Menține contextul conversației (history trimis din frontend).
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function chatAboutNote({ noteTitle, noteContent, noteSubject, history, userMessage }) {
  const contentSnippet = (noteContent || '').substring(0, 3000);

  const systemPrompt = `Ești un profesor de ${noteSubject || 'materie'} care ajută elevii să înțeleagă o notiță.
Răspunde în română, clar și pe înțelesul unui elev. Fii concis dar complet.
Dacă întrebarea nu are legătură cu notița, îndreaptă conversația înapoi la subiect.

NOTIȚĂ DE REFERINȚĂ:
Titlu: ${noteTitle}
Conținut: ${contentSnippet || '(conținut indisponibil)'}`;

  // Limita history la ultimele 10 mesaje pentru a nu depăși context window
  const recentHistory = (history || []).slice(-10);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHATBOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      const err = new Error('Rate limit. Încearcă din nou în câteva secunde.');
      err.statusCode = 429;
      throw err;
    }
    const err = new Error('Eroare la serviciul AI.');
    err.statusCode = 500;
    throw err;
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    const err = new Error('Răspuns gol de la AI.');
    err.statusCode = 500;
    throw err;
  }

  return reply;
}
