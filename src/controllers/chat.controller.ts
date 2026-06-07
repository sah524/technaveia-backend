import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

// ── GET /v1/conversations ─────────────────────────────────

export async function listConversations(req: AuthRequest, res: Response) {
  try {
    const conversas = await prisma.conversa.findMany({
      where: {
        participantes: { some: { usuarioId: req.userId } },
      },
      include: {
        participantes: { include: { usuario: { select: { id: true, nome: true, foto: true } } } },
        mensagens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: conversas });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao listar conversas' });
  }
}

// ── GET /v1/conversations/:id/messages ────────────────────

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const conversaId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!conversaId) {
      return res.status(400).json({ success: false, message: 'ID da conversa inválido' });
    }

    const mensagens = await prisma.mensagem.findMany({
      where: { conversaId },
      include: { remetente: { select: { id: true, nome: true, foto: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Marca como lidas
    await prisma.mensagem.updateMany({
      where: { conversaId, remetenteId: { not: req.userId }, lida: false },
      data: { lida: true },
    });

    return res.json({ success: true, data: mensagens });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
  }
}

// ── POST /v1/conversations/:id/messages ───────────────────

export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const conversaId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!conversaId) {
      return res.status(400).json({ success: false, message: 'ID da conversa inválido' });
    }

    const { tipo = 'text', conteudo, metadados } = req.body;

    const mensagem = await prisma.mensagem.create({
      data: {
        conversaId,
        remetenteId: req.userId!,
        tipo, conteudo, metadados,
      },
    });

    // Atualiza updatedAt da conversa
    await prisma.conversa.update({
      where: { id: conversaId },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json({ success: true, data: mensagem });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
  }
}
