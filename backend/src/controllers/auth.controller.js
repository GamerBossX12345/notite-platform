// Controller-ul = stratul subțire dintre HTTP și business logic.
// NU pune logică aici. Doar:
//   1. citește din req
//   2. cheamă serviciul
//   3. trimite răspuns sau next(err)

import * as authService from '../services/auth.service.js';
import { sendDeviceVerificationEmail, sendVerificationEmail } from '../services/email.service.js';
import { getBanInfo, getBanHistory } from '../services/ban.service.js';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

function getFrontendUrl(req) {
  return process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3000', ':5173');
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// GET /api/auth/ban-history — pentru utilizatorii care au fost banați în trecut
export async function banHistory(req, res, next) {
  try {
    const history = await getBanHistory(req.user.id);
    res.json(history); // null dacă n-a fost banat niciodată
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, username: true,
        name: true, school: true, grade: true, bio: true,
        reputation: true, role: true, createdAt: true, banned: true,
        showName: true, showSchool: true, showGrade: true,
        notifyOnRating: true, notifyOnComment: true, notifyOnReport: true,
        defaultSubject: true, defaultGradeLevel: true,
        darkMode: true,
        isTeacher: true, teacherVerifiedAt: true, teacherVerificationMethod: true,
      },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    let banInfo = null;
    let hasBanHistory = false;
    if (user.banned) {
      banInfo = await getBanInfo(user.id);
      hasBanHistory = true;
    } else {
      // Verifică dacă userul a fost vreodată banat (păstrăm bannedAt ca istoric)
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { bannedAt: true },
      });
      hasBanHistory = !!u?.bannedAt;
    }
    res.json({ ...user, banInfo, hasBanHistory });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const {
      showName, showSchool, showGrade,
      notifyOnRating, notifyOnComment, notifyOnReport,
      defaultSubject, defaultGradeLevel,
      darkMode,
    } = req.body;

    const updateData = {};
    if (typeof showName === 'boolean')        updateData.showName = showName;
    if (typeof showSchool === 'boolean')      updateData.showSchool = showSchool;
    if (typeof showGrade === 'boolean')       updateData.showGrade = showGrade;
    if (typeof notifyOnRating === 'boolean')  updateData.notifyOnRating = notifyOnRating;
    if (typeof notifyOnComment === 'boolean') updateData.notifyOnComment = notifyOnComment;
    if (typeof notifyOnReport === 'boolean')  updateData.notifyOnReport = notifyOnReport;
    if (typeof darkMode === 'boolean')        updateData.darkMode = darkMode;

    // defaultSubject: string sau null pentru "toate materiile"
    if (defaultSubject !== undefined) {
      updateData.defaultSubject = defaultSubject ? String(defaultSubject) : null;
    }
    // defaultGradeLevel: număr 5-12 sau null pentru "toate clasele"
    if (defaultGradeLevel !== undefined) {
      if (defaultGradeLevel === null || defaultGradeLevel === '') {
        updateData.defaultGradeLevel = null;
      } else {
        const n = Number(defaultGradeLevel);
        if (!Number.isInteger(n) || n < 5 || n > 12) {
          throw new AppError('Clasa implicită trebuie să fie între 5 și 12', 400);
        }
        updateData.defaultGradeLevel = n;
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        showName: true, showSchool: true, showGrade: true,
        notifyOnRating: true, notifyOnComment: true, notifyOnReport: true,
        defaultSubject: true, defaultGradeLevel: true,
        darkMode: true,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, email, username, school, grade, bio, password } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim();
    if (username !== undefined) updateData.username = username?.trim();
    if (school !== undefined) updateData.school = school?.trim() || null;
    if (grade !== undefined) updateData.grade = grade ? Number(grade) : null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) throw new AppError('Utilizator inexistent', 404);

    const sensitiveChange =
      (updateData.email && updateData.email !== currentUser.email) ||
      (updateData.username && updateData.username !== currentUser.username);

    if (sensitiveChange) {
      if (!password) throw new AppError('Parola este necesară pentru a schimba emailul sau username-ul', 400);
      const valid = await authService.verifyPassword(password, currentUser.passwordHash);
      if (!valid) throw new AppError('Parolă incorectă', 401);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true, email: true, username: true,
        name: true, school: true, grade: true, bio: true,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { password, confirm } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('Utilizator inexistent', 404);

    // Conturile banate pot șterge cu un singur confirm (fără parolă) — sunt deja
    // blocate și oricum ar fi șterse automat după termen.
    if (user.banned) {
      if (!confirm) throw new AppError('Confirmare necesară', 400);
    } else {
      if (!password) throw new AppError('Parolă necesară', 400);
      const validPassword = await authService.verifyPassword(password, user.passwordHash);
      if (!validPassword) throw new AppError('Parolă incorectă', 401);
    }

    await prisma.user.delete({ where: { id: req.user.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/users — listare publică cu paginare/sortare/căutare
export async function listPublicUsers(req, res, next) {
  try {
    const q          = (req.query.q || '').toString().trim();
    const sort       = (req.query.sort || 'reputation').toString();
    const page       = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize   = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 24));
    const adminsOnly = req.query.adminsOnly === 'true' || req.query.adminsOnly === '1';

    // Modul "doar admini": HEAD_ADMIN primul, restul sortați după nr. de rapoarte
    // actionate (descrescător). Paginare făcută în memorie deoarece sortăm pe count.
    if (adminsOnly) {
      const where = {
        role: { in: ['ADMIN', 'HEAD_ADMIN'] },
        ...(q ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name:     { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      };

      const admins = await prisma.user.findMany({
        where,
        select: {
          id: true, username: true, name: true, showName: true,
          school: true, showSchool: true, grade: true, showGrade: true,
          reputation: true, role: true, isTeacher: true, createdAt: true,
          _count: { select: { notes: true, actionedReports: true } },
        },
      });

      admins.sort((a, b) => {
        if (a.role === 'HEAD_ADMIN' && b.role !== 'HEAD_ADMIN') return -1;
        if (b.role === 'HEAD_ADMIN' && a.role !== 'HEAD_ADMIN') return 1;
        return b._count.actionedReports - a._count.actionedReports;
      });

      const total = admins.length;
      const start = (page - 1) * pageSize;
      const paged = admins.slice(start, start + pageSize).map(u => ({
        ...u,
        school: u.showSchool ? u.school : null,
        grade:  u.showGrade  ? u.grade  : null,
      }));

      return res.json({
        users: paged,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    }

    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name:     { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    let orderBy;
    switch (sort) {
      case 'username': orderBy = [{ username: 'asc' }]; break;
      case 'recent':   orderBy = [{ createdAt: 'desc' }]; break;
      case 'notes':    orderBy = [{ notes: { _count: 'desc' } }, { reputation: 'desc' }]; break;
      case 'reputation':
      default:         orderBy = [{ reputation: 'desc' }]; break;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, username: true, name: true, showName: true,
          school: true, showSchool: true, grade: true, showGrade: true,
          reputation: true, role: true, isTeacher: true, createdAt: true,
          _count: { select: { notes: true } },
        },
      }),
    ]);

    const sanitized = users.map(u => ({
      ...u,
      school: u.showSchool ? u.school : null,
      grade:  u.showGrade  ? u.grade  : null,
    }));

    res.json({
      users: sanitized,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    next(err);
  }
}
export async function getPublicProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, name: true, showName: true,
        school: true, showSchool: true, grade: true, showGrade: true,
        bio: true, reputation: true, createdAt: true,
        banCount: true,
        isTeacher: true, teacherVerifiedAt: true,
      },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    res.json({
      ...user,
      school: user.showSchool ? user.school : null,
      grade:  user.showGrade  ? user.grade  : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    if (result.requiresVerification && result.verificationToken) {
      // Trimitem emailul în fundal; răspunsul nu conține tokenul.
      sendVerificationEmail({
        to: result.user.email,
        username: result.user.username,
        token: result.verificationToken,
        frontendUrl: getFrontendUrl(req),
      }).catch(mailErr => console.error('[verify-email] email failed:', mailErr));

      return res.status(201).json({
        user: result.user,
        requiresVerification: true,
      });
    }

    res.status(201).json(result); // 201 Created — flow fără verificare: { user, token }
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    const result = await authService.verifyEmailToken(token);
    res.json(result); // { user, token }
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIp(req);
    const result = await authService.login(req.body, { userAgent, ipAddress });
    res.json(result); // 200 OK implicit
  } catch (err) {
    if (err.code === 'DEVICE_VERIFICATION_REQUIRED' && err.extra?.verificationToken) {
      // Trimitem emailul în fundal; răspunsul către client ascunde tokenul.
      const { email, username, verificationToken } = err.extra;
      sendDeviceVerificationEmail({
        to: email,
        username,
        token: verificationToken,
        frontendUrl: getFrontendUrl(req),
        userAgent: req.headers['user-agent'] || '',
        ipAddress: getClientIp(req),
      }).catch(mailErr => console.error('[device-verify] email failed:', mailErr));

      // Mascăm o parte din adresă în răspuns (de ex. d***@gmail.com).
      const masked = email.replace(/^(.).+(@.*)$/, '$1***$2');
      const cleanErr = new AppError(err.message, 403, {
        code: 'DEVICE_VERIFICATION_REQUIRED',
        extra: { email: masked },
      });
      return next(cleanErr);
    }
    next(err);
  }
}

export async function verifyDeviceLogin(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) throw new AppError('Lipsește tokenul', 400);
    await authService.verifyDeviceLoginToken(token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
