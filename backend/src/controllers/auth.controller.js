// Controller-ul = stratul subțire dintre HTTP și business logic.
// NU pune logică aici. Doar:
//   1. citește din req
//   2. cheamă serviciul
//   3. trimite răspuns sau next(err)

import * as authService from '../services/auth.service.js';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, username: true,
        name: true, school: true, grade: true,
        reputation: true, role: true, showName: true, darkMode: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { showName, darkMode } = req.body;
    const updateData = {};
    if (typeof showName === 'boolean') updateData.showName = showName;
    if (typeof darkMode === 'boolean') updateData.darkMode = darkMode;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, showName: true, darkMode: true },
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
    const { password } = req.body;
    if (!password) throw new AppError('Parolă necesară', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('Utilizator inexistent', 404);

    const validPassword = await authService.verifyPassword(password, user.passwordHash);
    if (!validPassword) throw new AppError('Parolă incorectă', 401);

    await prisma.user.delete({ where: { id: req.user.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getPublicProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true, username: true, name: true, showName: true, reputation: true, createdAt: true },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result); // 201 Created
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result); // 200 OK implicit
  } catch (err) {
    next(err);
  }
}
