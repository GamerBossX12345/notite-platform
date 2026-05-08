import { prisma } from '../db/prismaClient.js';

// GET /api/leaderboard?limit=10
export async function getLeaderboard(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        reputation: true,
        _count: { select: { notes: true } },
      },
      where: {
        notes: { some: { hidden: false } },
      },
      orderBy: {
        notes: { _count: 'desc' },
      },
      take: limit,
    });

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      username: u.username,
      name: u.name,
      noteCount: u._count.notes,
      reputation: u.reputation,
    }));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
}
