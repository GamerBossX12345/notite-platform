// Quiz Generator — folosește Groq API (OpenAI-compatible) pentru a genera întrebări.
import { AppError } from '../middleware/errorHandler.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function generateQuiz(noteContent, noteTitle, subject) {
  if (!noteContent) {
    throw new AppError('Notiță goală', 400);
  }

  const contentPreview = noteContent.substring(0, 3000);

  const prompt = `
Ești un profesor de ${subject || 'materie'}.
Bazat pe următoarea notiță, generează 5 întrebări de test cu răspunsuri multiple (A, B, C, D).

NOTIȚĂ:
Titlu: ${noteTitle || 'Fără titlu'}
Conținut: ${contentPreview}

INSTRUCȚIUNI:
- Generează 5 întrebări care testează înțelegerea conținutului
- Pentru fiecare întrebare: 1 răspuns corect + 3 distractori rezonabili
- Format JSON strict (nu alte explicații în afara JSON-ului)

RĂSPUNDE DOAR CU JSON (fără markdown, fără \`\`\` backticks):
{
  "questions": [
    {
      "id": 1,
      "question": "Întrebarea 1?",
      "options": ["A) Opțiune 1", "B) Opțiune 2", "C) Opțiune 3", "D) Opțiune 4"],
      "correctAnswer": "A"
    }
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
        max_tokens: 2000,
        temperature: 0.7,
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

  if (!responseText) {
    throw new AppError('Răspuns gol de la AI', 500);
  }

  let quizData;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    quizData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (parseErr) {
    console.error('JSON parse error:', responseText);
    throw new AppError('Răspunsul de la AI nu e valid JSON', 500);
  }

  if (!quizData.questions || !Array.isArray(quizData.questions)) {
    throw new AppError('Structură quiz nevalidă', 500);
  }

  const questions = quizData.questions.slice(0, 5);

  return {
    questions: questions.map((q, idx) => ({
      id: idx + 1,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
    })),
  };
}
