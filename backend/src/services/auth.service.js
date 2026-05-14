// Logica de business pentru auth: hash parolă, generare JWT, verificare login.
// Controllerul doar primește request-ul și deleagă aici.

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailQualifiesForTeacher } from '../controllers/teacher.controller.js';

const SALT_ROUNDS = 10; // mai mare = mai sigur dar mai lent. 10-12 e standard.
const DEFAULT_DEVICE_VERIFICATION_DAYS = 7;
const DEVICE_TOKEN_TTL = '24h';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function isEmailVerificationEnabled() {
  // Verificarea e activă DACĂ NU e bypass-uită. Implicit: activă (lipsa rândului = nu e bypass).
  const row = await prisma.systemConfig.findUnique({ where: { key: 'bypassEmailVerification' } });
  return row?.value?.trim() !== 'true';
}

export async function register({ email, username, password, name, school, grade, defaultSubject }) {
  if (!email || !username || !password) {
    throw new AppError('Email, username și parolă sunt obligatorii');
  }
  if (password.length < 8) {
    throw new AppError('Parola trebuie să aibă minim 8 caractere');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationEnabled = await isEmailVerificationEnabled();

  // Dacă verificarea e activă, generăm un token random și marcăm contul neverificat.
  // Tokenul brut e returnat o singură dată (pentru email), DB stochează aceeași valoare.
  let verificationToken = null;
  let createData = {
    email,
    username,
    passwordHash,
    name: name?.trim() || null,
    school: school?.trim() || null,
    grade: grade ? Number(grade) : null,
    // Materia preferată aleasă la înregistrare devine filtrul implicit pe homepage.
    defaultSubject: defaultSubject?.trim() || null,
  };
  if (verificationEnabled) {
    verificationToken = crypto.randomBytes(32).toString('hex');
    createData.emailVerified = false;
    createData.emailVerificationToken = verificationToken;
    createData.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  }

  // C3: auto-verificare profesor pentru emailuri cu domeniu școlar.
  if (emailQualifiesForTeacher(email)) {
    createData.isTeacher = true;
    createData.teacherVerifiedAt = new Date();
  }

  const user = await prisma.user.create({
    data: createData,
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
      emailVerified: true,
    },
  });

  if (verificationEnabled) {
    // Nu eliberăm JWT — userul trebuie să confirme emailul mai întâi.
    return { user, requiresVerification: true, verificationToken };
  }
  return { user, token: generateToken(user.id, user.username) };
}

export async function verifyEmailToken(token) {
  if (!token) throw new AppError('Lipsește tokenul', 400);

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });
  if (!user) throw new AppError('Link de verificare invalid', 400);
  if (user.emailVerified) {
    // Deja verificat — îl logăm direct (idempotent).
    return {
      user: stripSensitive(user),
      token: generateToken(user.id, user.username),
    };
  }
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    throw new AppError('Linkul de verificare a expirat', 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });
  return {
    user: stripSensitive(updated),
    token: generateToken(updated.id, updated.username),
  };
}

function stripSensitive(user) {
  const { passwordHash, emailVerificationToken, emailVerificationExpires, ...rest } = user;
  return rest;
}

export function generateDeviceFingerprint(userAgent, ipAddress) {
  const raw = `${userAgent || 'unknown-ua'}|${ipAddress || 'unknown-ip'}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function getAdminDeviceVerificationDays() {
  const row = await prisma.systemConfig.findUnique({
    where: { key: 'adminDeviceVerificationDays' },
  });
  const v = parseInt(row?.value, 10);
  if (v === -1) return -1;                    // -1 = feature dezactivat
  if (v === 0)  return 0;                     // 0  = verificare la fiecare login
  if (!isNaN(v) && v >= 1 && v <= 365) return v;
  return DEFAULT_DEVICE_VERIFICATION_DAYS;
}

function isAdminRole(role) {
  return role === 'ADMIN' || role === 'HEAD_ADMIN';
}

// Întoarce true dacă admin-ul TREBUIE să verifice dispozitivul prin email.
async function isDeviceVerificationRequired(user, deviceFingerprint) {
  if (!isAdminRole(user.role)) return false;

  const days = await getAdminDeviceVerificationDays();
  if (days === -1) return false;              // feature dezactivat de head admin
  if (days === 0)  return true;               // verificare la fiecare login
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const device = await prisma.deviceLogin.findUnique({
    where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint } },
  });

  // Nu a folosit niciodată acest dispozitiv → verificare obligatorie.
  if (!device) return true;
  // Niciodată verificat (rândul a fost creat în trecut fără confirmare) → verificare.
  if (!device.verifiedAt) return true;
  // A trecut prea mult de la ultima verificare → reverificare.
  if (device.verifiedAt < threshold) return true;

  return false;
}

async function touchDeviceLogin(userId, deviceFingerprint, { verified = false } = {}) {
  const now = new Date();
  await prisma.deviceLogin.upsert({
    where: { userId_deviceFingerprint: { userId, deviceFingerprint } },
    update: {
      lastLoginAt: now,
      ...(verified ? { verifiedAt: now } : {}),
    },
    create: {
      userId,
      deviceFingerprint,
      lastLoginAt: now,
      verifiedAt: verified ? now : null,
    },
  });
}

export function generateDeviceVerificationToken(userId, deviceFingerprint) {
  return jwt.sign(
    { userId, deviceFingerprint, purpose: 'device-verify' },
    process.env.JWT_SECRET,
    { expiresIn: DEVICE_TOKEN_TTL },
  );
}

export async function verifyDeviceLoginToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Link de verificare invalid sau expirat', 400);
  }
  if (payload.purpose !== 'device-verify' || !payload.userId || !payload.deviceFingerprint) {
    throw new AppError('Link de verificare invalid', 400);
  }
  await touchDeviceLogin(payload.userId, payload.deviceFingerprint, { verified: true });
  return { userId: payload.userId };
}

export async function login({ identifier, password }, { userAgent, ipAddress } = {}) {
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

  // Blocăm conturile neverificate doar dacă feature-ul de verificare e activ.
  // Pentru conturi vechi create înainte de activare, emailVerified rămâne true
  // (default-ul din schemă), deci nu sunt afectate.
  if (user.emailVerified === false) {
    throw new AppError(
      'Trebuie să-ți confirmi emailul înainte de a te conecta. Verifică inbox-ul.',
      403,
      { code: 'EMAIL_NOT_VERIFIED' },
    );
  }

  // Pentru admini: validăm dispozitivul. Dacă e nou sau verificarea a expirat,
  // blocăm login-ul și cerem confirmare prin email.
  if (isAdminRole(user.role)) {
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);
    const needsVerification = await isDeviceVerificationRequired(user, deviceFingerprint);

    if (needsVerification) {
      const verificationToken = generateDeviceVerificationToken(user.id, deviceFingerprint);
      // Înregistrăm încercarea fără a marca verificat — istoric pentru audit.
      await touchDeviceLogin(user.id, deviceFingerprint, { verified: false });
      throw new AppError(
        'Acces de pe un dispozitiv nou. Verifică-ți emailul pentru a confirma.',
        403,
        {
          code: 'DEVICE_VERIFICATION_REQUIRED',
          extra: {
            email: user.email,
            verificationToken, // doar pentru a fi pus în email de către controller
            userId: user.id,
            username: user.username,
          },
        },
      );
    }

    // Dispozitivul e verificat și în interval — doar actualizăm lastLoginAt.
    await touchDeviceLogin(user.id, deviceFingerprint, { verified: false });
  }

  // Scoatem passwordHash din răspuns.
  const { passwordHash, ...userPublic } = user;
  return { user: userPublic, token: generateToken(user.id, user.username) };
}

function generateToken(userId, username) {
  return jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
