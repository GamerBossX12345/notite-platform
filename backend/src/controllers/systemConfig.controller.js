import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_KEYS = ['bypassEmailVerification', 'adminDeviceVerificationDays', 'banAutoDeleteDays'];

// GET /api/admin/system-config — head admin only
export async function getConfig(req, res, next) {
  try {
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: ALLOWED_KEYS } } });
    const config = {};
    for (const k of ALLOWED_KEYS) config[k] = '';
    for (const row of rows) config[row.key] = row.value || '';
    res.json(config);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/system-config — head admin only
export async function updateConfig(req, res, next) {
  try {
    const updates = req.body || {};
    for (const key of Object.keys(updates)) {
      if (!ALLOWED_KEYS.includes(key)) throw new AppError(`Cheie nepermisă: ${key}`, 400);
      let value = updates[key]?.toString().trim() || null;

      // Toggle: normalizăm la "true"/"false" (string, fiindcă SystemConfig.value e String).
      if (key === 'bypassEmailVerification') {
        value = (value === 'true' || value === '1') ? 'true' : 'false';
      }

      // Validare zile pentru device verification.
      // Convenții: -1 = feature dezactivat. 0 = verificare la fiecare login.
      if (key === 'adminDeviceVerificationDays' && value) {
        const days = parseInt(value, 10);
        if (isNaN(days) || days < -1 || days > 365) {
          throw new AppError('Valoarea trebuie să fie -1 (dezactivat), 0 (de fiecare dată) sau între 1 și 365 zile', 400);
        }
      }

      // Validare zile până când contul banat se șterge automat.
      if (key === 'banAutoDeleteDays' && value) {
        const days = parseInt(value, 10);
        if (isNaN(days) || days < 1 || days > 365) {
          throw new AppError('Numărul de zile pentru ștergere automată trebuie să fie între 1 și 365', 400);
        }
      }

      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
