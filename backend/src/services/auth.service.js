// Logica de business pentru auth: hash parolă, generare JWT, verificare login.
// Controllerul doar primește request-ul și deleagă aici.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 10; // mai mare = mai sigur dar mai lent. 10-12 e standard.

export async function register({ email, username, password, name, school, grade }) {
  if (!email || !username || !password) {
    throw new AppError('Email, username și parolă sunt obligatorii');
  }
  if (password.length < 8) {
    throw new AppError('Parola trebuie să aibă minim 8 caractere');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      name: name?.trim() || null,
      school: school?.trim() || null,
      grade: grade ? Number(grade) : null,
    },
    // `select` ne asigură că passwordHash NU iese niciodată din funcție.
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      school: true,
      grade: true,
      reputation: true,
      role: true,
      createdAt: true,
    },
  });

  return { user, token: generateToken(user.id, user.username) };
}

export async function login({ identifier, password }) {
  const isEmail = identifier?.includes('@');
  const user = await prisma.user.findUnique({
    where: isEmail ? { email: identifier } : { username: identifier },
  });

  // Mesaj generic intenționat — nu spunem dacă identificatorul există sau parola e greșită.
  if (!user) {
    throw new AppError('Email/username sau parolă incorectă', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Email sau parolă incorectă', 401);
  }

  // Scoatem passwordHash din răspuns.
  const { passwordHash, ...userPublic } = user;
  return { user: userPublic, token: generateToken(user.id, user.username) };
}

function generateToken(userId, username) {
  return jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
