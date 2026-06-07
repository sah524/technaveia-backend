import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

const router = Router();
router.use(authMiddleware);

// ── GET /v1/users/me ──────────────────────────────────────

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: { id: true, nome: true, email: true, telefone: true, foto: true, role: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    return res.json({ success: true, data: user });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
  }
});

// ── PATCH /v1/users/me ────────────────────────────────────

router.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, foto } = req.body;

    const user = await prisma.usuario.update({
      where: { id: req.userId },
      data: {
        ...(nome      && { nome }),
        ...(telefone  && { telefone }),
        ...(foto      && { foto }),
      },
      select: { id: true, nome: true, email: true, telefone: true, foto: true },
    });

    return res.json({ success: true, data: user });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
  }
});

export default router;