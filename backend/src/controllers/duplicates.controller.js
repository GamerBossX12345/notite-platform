// Duplicate detection controller
import { AppError } from '../middleware/errorHandler.js';
import { validateRequest, DuplicateCheckSchema } from '../middleware/validators.js';
import { compareTexts, findSimilarDocuments } from '../services/shingling.service.js';
import { prisma } from '../db/prismaClient.js';

// POST /api/duplicates/check
// Verifica similaritate text cu alte note din sistem
export async function check(req, res, next) {
  try {
    const validated = validateRequest(DuplicateCheckSchema, req.body);

    // Obține toate notele din DB (fără cea curenta daca se specifică id)
    const notes = await prisma.note.findMany({
      select: { id: true, title: true, content: true, authorId: true },
      where: req.body.noteIdToExclude ? { id: { not: req.body.noteIdToExclude } } : undefined,
    });

    // Extrage text din notele pentru comparare
    const docsToCompare = notes.map((note) => {
      const textContent = typeof note.content === 'string'
        ? note.content
        : JSON.stringify(note.content || '');
      return { id: note.id, title: note.title, content: textContent, authorId: note.authorId };
    });

    // Găsește documente similare
    const suspicious = await findSimilarDocuments(
      validated.text,
      docsToCompare,
      validated.threshold
    );

    // Top 5 matches
    const topMatches = suspicious.slice(0, 5).map((match) => ({
      noteId: match.id,
      title: match.title,
      similarity: (match.similarity * 100).toFixed(1) + '%',
      isSuspicious: match.isSuspicious,
    }));

    res.json({
      message: topMatches.length > 0 ? 'Potențiale duplicate detectate' : 'Nu s-au găsit similitudini',
      count: topMatches.length,
      threshold: validated.threshold,
      matches: topMatches,
    });
  } catch (err) {
    next(err);
  }
}
