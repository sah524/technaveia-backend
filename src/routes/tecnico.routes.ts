import { Router } from 'express';
import { searchTechnicians, getTechnician, getTechnicianReviews, getTechnicianAvailability, updateMyProfile, getMyProfile } from '../controllers/tecnico.controller';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();
router.get('/',                    searchTechnicians);
router.get('/me',                  authMiddleware, getMyProfile);
router.get('/:id',                 getTechnician);
router.get('/:id/reviews',         getTechnicianReviews);
router.get('/:id/availability',    getTechnicianAvailability);
router.put('/me',                  authMiddleware, updateMyProfile);

// ── POST /v1/technicians/me/services ─────────────────────
router.post('/me/services', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, categoria, subcategoria, descricao, modalidade, tipoPreco, valor, tempoEstimado, garantiaDias } = req.body;

    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    if (!nome || !categoria || !descricao) {
      return res.status(400).json({ success: false, message: 'nome, categoria e descricao são obrigatórios' });
    }

    const servico = await prisma.servico.create({
      data: {
        tecnicoId: tecnico.id,
        nome,
        categoria,
        subcategoria: subcategoria ?? null,
        descricao,
        modalidade: modalidade ?? 'presencial',
        tipoPreco: tipoPreco ?? 'fixo',
        valor: valor ?? null,
        tempoEstimado: tempoEstimado ?? null,
        garantiaDias: garantiaDias ?? 0,
      },
    });

    return res.status(201).json({ success: true, data: servico });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao criar serviço' });
  }
});

// ── PUT /v1/technicians/me/services/:id ──────────────────
router.put('/me/services/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const serviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico || servico.tecnicoId !== tecnico.id) {
      return res.status(403).json({ success: false, message: 'Serviço não encontrado ou sem permissão' });
    }

    const { nome, categoria, subcategoria, descricao, modalidade, tipoPreco, valor, tempoEstimado, garantiaDias, ativo } = req.body;

    const updated = await prisma.servico.update({
      where: { id: serviceId },
      data: {
        ...(nome && { nome }),
        ...(categoria && { categoria }),
        ...(subcategoria !== undefined && { subcategoria }),
        ...(descricao && { descricao }),
        ...(modalidade && { modalidade }),
        ...(tipoPreco && { tipoPreco }),
        ...(valor !== undefined && { valor }),
        ...(tempoEstimado !== undefined && { tempoEstimado }),
        ...(garantiaDias !== undefined && { garantiaDias }),
        ...(ativo !== undefined && { ativo }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar serviço' });
  }
});

// ── DELETE /v1/technicians/me/services/:id ────────────────
router.delete('/me/services/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const serviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico || servico.tecnicoId !== tecnico.id) {
      return res.status(403).json({ success: false, message: 'Serviço não encontrado ou sem permissão' });
    }

    await prisma.servico.delete({ where: { id: serviceId } });
    return res.json({ success: true, message: 'Serviço removido' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao remover serviço' });
  }
});

export default router;
