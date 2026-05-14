// Helper pentru a scrie intrări în audit log. Niciodată nu aruncă — log-ul de
// audit nu trebuie să blocheze acțiunea principală.
import { prisma } from '../db/prismaClient.js';

export async function logAudit({ targetUserId = null, actorId = null, action, details = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        targetUserId,
        actorId,
        action,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      },
    });
  } catch (err) {
    console.error('[audit] log failed:', err.message);
  }
}
