import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateRequest, CreateNoteSchema, UpdateNoteSchema, DuplicateCheckSchema } from '../middleware/validators.js';
import { fingerprintText, compareFingerprints } from '../services/shingling.service.js';
import { generateEmbedding, noteToText } from '../services/embedding.service.js';
import { moderateReport } from '../services/moderation.service.js';
import { resolveTagIds } from './tags.controller.js';
import { extractAndStoreForNote } from '../services/documentText.service.js';

// Acceptă tags ca array sau ca string JSON (din FormData).
function parseTagsFromBody(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback: virgule
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

async function autoModerate(note) {
  try {
    const hasTextContent = note.content && JSON.stringify(note.content).length > 10;
    const hasFileText = note.extractedFileText && note.extractedFileText.length > 10;
    // Moderăm dacă există fie text TipTap, fie text extras din fișier.
    if (!hasTextContent && !hasFileText) return;

    const noteContent = typeof note.content === 'string'
      ? note.content
      : JSON.stringify(note.content || '');

    const result = await moderateReport({
      noteTitle: note.title,
      noteContent,
      noteSubject: note.subject,
      fileText: note.extractedFileText || '',
      reason: 'CONTINUT_NEPOTRIVIT',
      details: 'Verificare automată la publicare',
    });

    if (result?.verdict === 'VALID') {
      await prisma.note.update({ where: { id: note.id }, data: { hidden: true } });
      await prisma.report.create({
        data: {
          reporterId: note.authorId,
          noteId: note.id,
          reason: 'CONTINUT_NEPOTRIVIT',
          details: 'Verificare automată la publicare',
          aiVerdict: 'VALID',
          aiVerdictText: result.text,
        },
      });
    }
  } catch (err) {
    console.error('[AutoMod] Failed for note', note.id, err.message);
  }
}

async function storeEmbedding(noteId, note) {
  try {
    // Includem tag-urile în textul de embeddat — semantic search le va potrivi.
    const tagRows = await prisma.noteTag.findMany({
      where: { noteId },
      include: { tag: { select: { name: true } } },
    });
    const tagNames = tagRows.map(t => t.tag.name);
    const text = noteToText({ ...note, tagNames });
    const embedding = await generateEmbedding(text);
    await prisma.note.update({
      where: { id: noteId },
      data: { embedding },
    });
  } catch (err) {
    console.error('[Embeddings] Failed for note', noteId, err.message);
  }
}

function cosineSimilarity(a, b) {
  // Embeddingurile sunt deja normalizate (normalize: true în generateEmbedding),
  // deci produsul scalar = cosine similarity.
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const VALID_TYPES = ['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA', 'FORMULE'];

// GET /api/notes
// Listare cu filtre, căutare, sortare și paginare. Public.
export async function list(req, res, next) {
  try {
    const {
      subject, gradeLevel, type, author, school, tag, q,
      sort = 'recent', page = '1', pageSize = '12',
    } = req.query;

    const where = { hidden: false };
    if (subject) where.subject = subject;
    if (gradeLevel) where.gradeLevel = Number(gradeLevel);
    if (type && VALID_TYPES.includes(type)) where.type = type;
    if (author) where.author = { username: author };
    // Filtru "doar din școala X" — match exact pe școala autorului (case-insensitive).
    if (school) {
      where.author = { ...(where.author || {}), school: { equals: school, mode: 'insensitive' } };
    }
    // Filtru pe tag — match pe nume normalizat (lowercase).
    if (tag) {
      where.tags = { some: { tag: { name: tag.toString().trim().toLowerCase() } } };
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort === 'popular' ? { viewCount: 'desc' } :
      sort === 'rating'  ? { avgRating: 'desc' } :
      { createdAt: 'desc' };

    const pageNum     = Math.max(1, Number(page));
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize)));

    const [notes, total] = await prisma.$transaction([
      prisma.note.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy,
        include: {
          author: { select: { id: true, username: true, isTeacher: true } },
          tags:   { include: { tag: { select: { id: true, name: true, isOfficial: true } } } },
        },
      }),
      prisma.note.count({ where }),
    ]);

    res.json({
      notes,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum) || 1,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id
// Detaliu notiță. Public.
export async function getById(req, res, next) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, username: true, isTeacher: true } },
        tags:   { include: { tag: { select: { id: true, name: true, isOfficial: true } } } },
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, username: true, isTeacher: true } },
            replies: {
              include: { user: { select: { id: true, username: true, isTeacher: true } } },
            },
          },
        },
        appeals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, status: true, message: true, resolution: true,
            adminResponse: true, createdAt: true,
          },
        },
      },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'HEAD_ADMIN';
    if (note.hidden && req.user?.id !== note.authorId && !isAdmin) {
      throw new AppError('Această notiță a fost ascunsă temporar în urma unui raport.', 403);
    }

    // Nu expune relația de apeluri către alți utilizatori
    if (req.user?.id !== note.authorId && !isAdmin) {
      delete note.appeals;
      delete note.deletionScheduledAt;
      delete note.deletionReason;
    }

    // Incrementează viewCount (dacă nu e autorul)
    if (req.user?.id !== note.authorId) {
      await prisma.note.update({
        where: { id: req.params.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    res.json(note);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes
// Creare notiță. Acceptă multipart/form-data (câmpuri text + fișier opțional).
export async function create(req, res, next) {
  try {
    const validated = validateRequest(CreateNoteSchema, req.body);

    // `content` vine ca JSON string din FormData; poate lipsi dacă nota e doar fișier.
    let content = null;
    if (req.body.content) {
      try { content = JSON.parse(req.body.content); } catch { content = null; }
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Generează fingerprint pentru duplicate detection
    const textContent = typeof content === 'string' ? content : JSON.stringify(content || '');
    const contentHash = fingerprintText(textContent);

    const note = await prisma.note.create({
      data: {
        title: validated.title,
        subject: validated.subject,
        gradeLevel: validated.gradeLevel,
        chapter: validated.chapter || null,
        type: validated.type,
        content,
        fileUrl,
        contentHash,
        authorId: req.user.id,
      },
    });

    // Tag-uri — opționale. Trimise ca JSON string în FormData sau array în JSON body.
    const tagNames = parseTagsFromBody(req.body.tags);
    if (tagNames.length > 0) {
      const tagIds = await resolveTagIds(tagNames);
      await prisma.noteTag.createMany({
        data: tagIds.map(tagId => ({ noteId: note.id, tagId })),
        skipDuplicates: true,
      });
    }

    res.status(201).json(note);
    // Extragem textul fișierului ÎNAINTE de embedding/moderare ca acestea să-l
    // poată folosi; lanț secvențial în background.
    setImmediate(async () => {
      if (note.fileUrl) await extractAndStoreForNote(note.id);
      const fresh = await prisma.note.findUnique({ where: { id: note.id } });
      if (fresh) {
        storeEmbedding(fresh.id, fresh);
        autoModerate(fresh);
      }
    });
  } catch (err) {
    // Dacă notița nu a putut fi creată, șterge fișierul urcat (dacă există).
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
}

// PUT /api/notes/:id
// Actualizare notiță. Doar autorul. Acceptă atât JSON cât și multipart/form-data
// (când se încarcă un fișier). Câmpuri permise: title, chapter, content, subject,
// gradeLevel, type, fișier nou, removeFile flag.
export async function update(req, res, next) {
  try {
    // `content` vine ca string JSON când e trimis prin FormData
    if (typeof req.body.content === 'string') {
      try { req.body.content = JSON.parse(req.body.content); } catch { /* lasă-l string */ }
    }
    if (req.body.gradeLevel) req.body.gradeLevel = Number(req.body.gradeLevel);

    // Validăm doar fără content (Zod schema actuală cere string), facem manual pentru content/file
    const { content, removeFile, ...rest } = req.body;
    const validated = validateRequest(UpdateNoteSchema, rest);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    // Autorul își poate edita propria notiță. Profesorii verificați pot corecta
    // notițe ale altor utilizatori (cerință funcțională specifică).
    let isTeacher = false;
    if (note.authorId !== req.user.id) {
      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isTeacher: true },
      });
      isTeacher = !!u?.isTeacher;
      if (!isTeacher) throw new AppError('Nu ai voie să modifici', 403);
    }

    const data = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.chapter !== undefined) data.chapter = validated.chapter || null;
    if (validated.subject !== undefined) data.subject = validated.subject;
    if (validated.gradeLevel !== undefined) data.gradeLevel = validated.gradeLevel;
    if (validated.type !== undefined) data.type = validated.type;
    if (content !== undefined) data.content = content;

    // Înlocuire fișier
    if (req.file) {
      // Șterge fișierul vechi dacă există
      if (note.fileUrl) {
        const oldPath = path.join('uploads', path.basename(note.fileUrl));
        fs.unlink(oldPath, () => {});
      }
      data.fileUrl = `/uploads/${req.file.filename}`;
    } else if (removeFile === 'true' || removeFile === true) {
      // Șterge fișierul existent fără să-l înlocuiască
      if (note.fileUrl) {
        const oldPath = path.join('uploads', path.basename(note.fileUrl));
        fs.unlink(oldPath, () => {});
      }
      data.fileUrl = null;
    }

    if (data.content !== undefined) {
      const textContent = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '');
      data.contentHash = fingerprintText(textContent);
    }

    const updated = await prisma.note.update({
      where: { id: note.id },
      data,
    });

    // Tag-uri — dacă au fost trimise în body, înlocuiesc setul existent.
    // Lipsa câmpului `tags` lasă tag-urile existente neatinse.
    if (req.body.tags !== undefined) {
      const tagNames = parseTagsFromBody(req.body.tags);
      const tagIds = await resolveTagIds(tagNames);
      await prisma.noteTag.deleteMany({ where: { noteId: note.id } });
      if (tagIds.length > 0) {
        await prisma.noteTag.createMany({
          data: tagIds.map(tagId => ({ noteId: note.id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    res.json(updated);
    // Dacă fișierul s-a schimbat (înlocuit sau scos), re-extragem textul înainte
    // de a reface embedding-ul. Altfel doar reactualizăm embedding-ul.
    const fileChanged = 'fileUrl' in data;
    setImmediate(async () => {
      if (fileChanged) await extractAndStoreForNote(updated.id);
      const fresh = await prisma.note.findUnique({ where: { id: updated.id } });
      if (fresh) storeEmbedding(fresh.id, fresh);
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

// DELETE /api/notes/:id
// Ștergere notiță. Doar autorul.
export async function remove(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId !== req.user.id) throw new AppError('Nu ai voie să ștergi', 403);

    if (note.fileUrl) {
      const filePath = path.join('uploads', path.basename(note.fileUrl));
      fs.unlink(filePath, () => {}); // ignoră erori (fișierul poate fi deja absent)
    }

    await prisma.note.delete({ where: { id: note.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/search/semantic?q=...
// "Hot score" inspirat de algoritmul Reddit: combină engagement-ul (views +
// rating-uri) cu recența. Notițele recente și apreciate urcă; cele vechi cad
// chiar dacă au scor mare cumulat.
function hotScore(note) {
  const engagement =
    note.viewCount +
    note.ratingCount * 5 +
    Math.round(note.avgRating * note.ratingCount * 3);
  const order = Math.log10(Math.max(engagement, 1));
  // Offset epoch ca să ținem numerele mici. ~2023-11-14.
  const seconds = new Date(note.createdAt).getTime() / 1000 - 1700000000;
  return Math.round((order + seconds / 45000) * 1000) / 1000;
}

// GET /api/notes/trending — top notițe după hot score, din ultimele 30 de zile.
// Public. "Weekly best" distinct de "popular all-time" (sort=popular).
export async function trending(req, res, next) {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.note.findMany({
      where: { hidden: false, createdAt: { gte: since } },
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, isTeacher: true } },
        tags:   { include: { tag: { select: { id: true, name: true, isOfficial: true } } } },
      },
    });

    const ranked = candidates
      .map(n => ({ ...n, hotScore: hotScore(n) }))
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, limit);

    res.json(ranked);
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id/similar — notițe similare cu cea dată, prin cosine similarity
// pe embeddings. Folosește același calcul ca semanticSearch — fără pgvector.
export async function similarNotes(req, res, next) {
  try {
    const noteId = req.params.id;
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 6));

    const source = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, embedding: true, subject: true, hidden: true },
    });
    if (!source) throw new AppError('Notiță inexistentă', 404);
    if (!source.embedding) {
      // Notița nu are încă embedding (recent creată sau eșec). Întoarcem listă goală.
      return res.json([]);
    }
    if (source.hidden) return res.json([]);

    const queryVec = source.embedding;

    // Fetch candidates — preferăm pe cele cu același subject pentru context, apoi
    // completăm cu altele dacă e nevoie. Limita 200 ca să nu explodeze RAM.
    const candidates = await prisma.note.findMany({
      where: {
        hidden: false,
        id: { not: source.id },
        embedding: { not: null },
      },
      take: 200,
      orderBy: [{ subject: source.subject ? 'asc' : 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, username: true, isTeacher: true } },
        tags:   { include: { tag: { select: { id: true, name: true, isOfficial: true } } } },
      },
    });

    const scored = [];
    for (const n of candidates) {
      if (!Array.isArray(n.embedding)) continue;
      const sim = cosineSimilarity(queryVec, n.embedding);
      const { embedding, ...rest } = n;
      scored.push({ ...rest, similarity: Math.round(sim * 1000) / 1000 });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    res.json(scored.slice(0, limit));
  } catch (err) {
    next(err);
  }
}

// Căutare semantică cu embeddings. Public. Cosine similarity calculat în Node
// (fără pgvector — embeddingul e Json în DB).
export async function semanticSearch(req, res, next) {
  try {
    const { q, limit = '12' } = req.query;
    if (!q?.trim()) return res.json([]);

    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    // Prefixul "query:" e recomandat de modelul E5 pentru interogări
    const queryVec = await generateEmbedding(`query: ${q.trim()}`);

    const candidates = await prisma.note.findMany({
      where: { hidden: false, NOT: { embedding: { equals: null } } },
      select: {
        id: true, title: true, subject: true, gradeLevel: true, type: true,
        chapter: true, avgRating: true, ratingCount: true, viewCount: true,
        createdAt: true, embedding: true,
        author: { select: { id: true, username: true } },
      },
    });

    const scored = [];
    for (const n of candidates) {
      if (!Array.isArray(n.embedding) || n.embedding.length !== queryVec.length) continue;
      const sim = cosineSimilarity(queryVec, n.embedding);
      // eslint-disable-next-line no-unused-vars
      const { embedding, ...rest } = n;
      scored.push({ ...rest, similarity: Math.round(sim * 1000) / 1000 });
    }
    scored.sort((a, b) => b.similarity - a.similarity);

    res.json(scored.slice(0, limitNum));
  } catch (err) {
    next(err);
  }
}
