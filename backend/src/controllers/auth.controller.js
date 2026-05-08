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
        reputation: true, role: true, showName: true, createdAt: true,
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
    const { showName } = req.body;
    if (typeof showName !== 'boolean') throw new AppError('Valoare invalidă pentru showName', 400);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { showName },
      select: { id: true, showName: true },
    });
    res.json(updated);
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
