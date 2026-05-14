// Logica pentru ban + apel.
// Un cont „banned" va fi șters automat după N zile (configurabil de head admin),
// dacă nu are un apel deschis (status PENDING sau OPEN).
import { prisma } from '../db/prismaClient.js';

const DEFAULT_BAN_AUTO_DELETE_DAYS = 14;

export async function getBanAutoDeleteDays() {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'banAutoDeleteDays' } });
  const v = parseInt(row?.value, 10);
  if (!isNaN(v) && v >= 1 && v <= 365) return v;
  return DEFAULT_BAN_AUTO_DELETE_DAYS;
}

// Istoric ban: dacă utilizatorul a fost banat în trecut (chiar dacă nu mai e
// banat acum), întoarce ultimul ban + verdictul apelului. Folosit pe pagina
// /ban-history pentru utilizatorii unbanați.
export async function getBanHistory(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      banned: true, bannedAt: true, banReason: true, banCount: true,
      banNote: { select: { id: true, title: true, subject: true } },
      banComment: {
        select: {
          id: true, content: true, createdAt: true,
          note: { select: { id: true, title: true } },
        },
      },
      banAppeals: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, status: true, message: true, resolution: true,
          adminResponse: true, createdAt: true, resolvedAt: true,
        },
      },
    },
  });
  if (!user) return null;

  // Jurnalul complet de ban-uri (toate ban-urile primite vreodată).
  const recordsRaw = await prisma.banRecord.findMany({
    where: { userId },
    orderBy: { bannedAt: 'desc' },
    select: {
      id: true, reason: true, bannedAt: true, liftedAt: true, liftReason: true,
      noteId: true, commentId: true,
    },
  });

  // Atașăm titlul notiței / textul comentariului (dacă mai există).
  const noteIds = [...new Set(recordsRaw.map(r => r.noteId).filter(Boolean))];
  const commentIds = [...new Set(recordsRaw.map(r => r.commentId).filter(Boolean))];
  const [notes, comments] = await Promise.all([
    noteIds.length
      ? prisma.note.findMany({ where: { id: { in: noteIds } }, select: { id: true, title: true } })
      : [],
    commentIds.length
      ? prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, content: true } })
      : [],
  ]);
  const noteMap = Object.fromEntries(notes.map(n => [n.id, n]));
  const commentMap = Object.fromEntries(comments.map(c => [c.id, c]));
  const records = recordsRaw.map(r => ({
    id: r.id,
    reason: r.reason,
    bannedAt: r.bannedAt,
    liftedAt: r.liftedAt,
    liftReason: r.liftReason,
    note: r.noteId ? (noteMap[r.noteId] || { id: r.noteId, title: '(notiță ștearsă)' }) : null,
    comment: r.commentId ? (commentMap[r.commentId] || { id: r.commentId, content: '(comentariu șters)' }) : null,
  }));

  // Nimic de afișat dacă n-a fost banat niciodată.
  if (!user.bannedAt && records.length === 0) return null;

  return {
    currentlyBanned: user.banned,
    banCount: user.banCount,
    bannedAt: user.bannedAt,
    banReason: user.banReason,
    banNote: user.banNote,
    banComment: user.banComment,
    appeals: user.banAppeals,
    records,
  };
}

// Întoarce informațiile despre ban + apel pentru un utilizator banat.
// Folosit la /auth/me și pe pagina /banned.
export async function getBanInfo(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      banned: true, bannedAt: true, banReason: true,
      banNote: { select: { id: true, title: true, subject: true, hidden: true } },
      banComment: {
        select: {
          id: true, content: true, createdAt: true,
          note: { select: { id: true, title: true } },
        },
      },
      banAppeals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true, status: true, message: true, resolution: true,
          adminResponse: true, createdAt: true, openedAt: true, resolvedAt: true,
        },
      },
    },
  });
  if (!user || !user.banned) return null;

  const days = await getBanAutoDeleteDays();
  const autoDeleteAt = user.bannedAt
    ? new Date(user.bannedAt.getTime() + days * 86400000)
    : null;

  return {
    banned: true,
    bannedAt: user.bannedAt,
    banReason: user.banReason,
    banNote: user.banNote,
    banComment: user.banComment,
    autoDeleteAt,
    autoDeleteDays: days,
    appeal: user.banAppeals[0] || null,
  };
}

// Verifică dacă userul are un apel activ (nu RESOLVED). Folosit la sweeper
// pentru a NU șterge contul cât timp tichetul e deschis.
export async function hasActiveAppeal(userId) {
  const count = await prisma.banAppeal.count({
    where: { userId, status: { not: 'RESOLVED' } },
  });
  return count > 0;
}

// Sweeper: șterge conturile banate al căror termen a expirat și care nu
// au apel activ. Apelat periodic din server.js + la cerere.
export async function sweepBannedAccounts() {
  const days = await getBanAutoDeleteDays();
  const cutoff = new Date(Date.now() - days * 86400000);

  const candidates = await prisma.user.findMany({
    where: { banned: true, bannedAt: { lt: cutoff } },
    select: { id: true, username: true },
  });

  let deleted = 0;
  for (const u of candidates) {
    const active = await hasActiveAppeal(u.id);
    if (active) continue;
    await prisma.user.delete({ where: { id: u.id } });
    deleted++;
    console.log(`[BanSweeper] deleted user ${u.username}`);
  }
  return { scanned: candidates.length, deleted };
}

async function hasActiveNoteAppeal(noteId) {
  const count = await prisma.noteAppeal.count({
    where: { noteId, status: { not: 'RESOLVED' } },
  });
  return count > 0;
}

// Sweeper pentru notițe programate pentru ștergere: șterge cele al căror termen
// a expirat și care nu au apel activ.
export async function sweepScheduledNoteDeletions() {
  const candidates = await prisma.note.findMany({
    where: { deletionScheduledAt: { lt: new Date() } },
    select: { id: true, title: true },
  });

  let deleted = 0;
  for (const n of candidates) {
    const active = await hasActiveNoteAppeal(n.id);
    if (active) continue;
    await prisma.note.delete({ where: { id: n.id } });
    deleted++;
    console.log(`[NoteSweeper] deleted note ${n.title}`);
  }
  return { scanned: candidates.length, deleted };
}
