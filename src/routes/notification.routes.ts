import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

const router = Router();
router.use(authMiddleware);

// ── GET /v1/notifications ─────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await prisma.notificacao.findMany({
      where: { usuarioId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({ success: true, data: notifs });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar notificações' });
  }
});

// ── POST /v1/notifications/read-all ──────────────────────

router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notificacao.updateMany({
      where: { usuarioId: req.userId, lida: false },
      data: { lida: true },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao marcar notificações' });
  }
});

export default router;