import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

// ── GET /v1/technicians ───────────────────────────────────

export async function searchTechnicians(req: Request, res: Response) {
  try {
    const { categoria, modalidade, avaliacao, query } = req.query;

    const tecnicos = await prisma.tecnico.findMany({
      where: {
        status: 'aprovado',
        ...(modalidade && { modalidade: modalidade as any }),
        ...(avaliacao && { avaliacao: { gte: Number(avaliacao) } }),
        ...(categoria && {
          especialidades: { some: { categoria: { contains: categoria as string, mode: 'insensitive' } } },
        }),
        ...(query && {
          usuario: { nome: { contains: query as string, mode: 'insensitive' } },
        }),
      },
      include: {
        usuario: { select: { nome: true, foto: true, email: true } },
        especialidades: true,
      },
      orderBy: { avaliacao: 'desc' },
    });

    return res.json({ success: true, data: tecnicos });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar técnicos' });
  }
}

// ── GET /v1/technicians/:id ───────────────────────────────

export async function getTechnician(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'ID do técnico inválido' });

    const tecnico = await prisma.tecnico.findUnique({
      where: { id },
      include: {
        usuario: { select: { nome: true, foto: true, email: true, telefone: true } },
        especialidades: true,
        servicos: { where: { ativo: true } },
        documentos: { where: { tipo: 'certificado' } },
      },
    });

    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    return res.json({ success: true, data: tecnico });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar técnico' });
  }
}

// ── GET /v1/technicians/:id/reviews ──────────────────────

export async function getTechnicianReviews(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'ID do técnico inválido' });

    const reviews = await prisma.avaliacao.findMany({
      where: { tecnicoId: id },
      include: {
        cliente: { select: { nome: true, foto: true } },
        pedido: { select: { categoria: true, subcategoria: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: reviews });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar avaliações' });
  }
}

// ── PUT /v1/technicians/me ────────────────────────────────

export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    const { bio, raioAtendimento, modalidade, especialidades } = req.body;

    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    await prisma.tecnico.update({
      where: { id: tecnico.id },
      data: {
        ...(bio && { bio }),
        ...(raioAtendimento && { raioAtendimento }),
        ...(modalidade && { modalidade }),
      },
    });

    if (especialidades?.length) {
      await prisma.tecnicoEspecialidade.deleteMany({ where: { tecnicoId: tecnico.id } });
      await prisma.tecnicoEspecialidade.createMany({
        data: especialidades.map((cat: string) => ({ tecnicoId: tecnico.id, categoria: cat })),
      });
    }

    return res.json({ success: true, message: 'Perfil atualizado' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
  }
}
