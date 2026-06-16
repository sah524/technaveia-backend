import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

// ── GET /v1/admin/technicians/pending ─────────────────────

export async function getPendingTechnicians(req: AuthRequest, res: Response) {
  try {
    const tecnicos = await prisma.tecnico.findMany({
      where: { status: 'pendente' },
      include: {
        usuario: { select: { nome: true, email: true, telefone: true, createdAt: true } },
        especialidades: true,
        documentos: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: tecnicos });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar técnicos pendentes' });
  }
}

// ── PATCH /v1/admin/technicians/:id/approve ───────────────

export async function approveTechnician(req: AuthRequest, res: Response) {
  try {
    const tecnico = await prisma.tecnico.update({
      where: { id: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id },
      data: { status: 'aprovado', verificado: true },
    });
    // TODO: enviar notificação push/email para o técnico
    return res.json({ success: true, data: tecnico });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao aprovar técnico' });
  }
}

// ── PATCH /v1/admin/technicians/:id/reject ────────────────

export async function rejectTechnician(req: AuthRequest, res: Response) {
  try {
    const { motivo } = req.body;
    const tecnicoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const tecnico = await prisma.tecnico.update({
      where: { id: tecnicoId },
      data: { status: 'reprovado' },
    });
    // TODO: enviar e-mail com motivo
    console.log(`Técnico ${tecnico.id} reprovado. Motivo: ${motivo}`);
    return res.json({ success: true, data: tecnico });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao reprovar técnico' });
  }
}

// ── GET /v1/admin/users ───────────────────────────────────

export async function listUsers(req: AuthRequest, res: Response) {
  try {
    const { query, status } = req.query;

    const users = await prisma.usuario.findMany({
      where: {
        ...(status === 'bloqueado' && { bloqueado: true }),
        ...(status === 'ativo' && { bloqueado: false, ativo: true }),
        ...(query && {
          OR: [
            { nome: { contains: query as string, mode: 'insensitive' } },
            { email: { contains: query as string, mode: 'insensitive' } },
            { cpf: { contains: query as string } },
          ],
        }),
      },
      select: {
        id: true, nome: true, email: true, cpf: true,
        telefone: true, bloqueado: true, ativo: true, role: true,
        createdAt: true, cidade: true,
        _count: { select: { pedidosCliente: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
  }
}

// ── PATCH /v1/admin/users/:id/block ──────────────────────

export async function toggleUserBlock(req: AuthRequest, res: Response) {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { bloqueado: !user.bloqueado },
    });

    return res.json({ success: true, data: { bloqueado: updated.bloqueado } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao bloquear/desbloquear usuário' });
  }
}

// ── GET /v1/admin/dashboard ───────────────────────────────

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const [totalUsuarios, totalPedidos, disputas, aprovacoes] = await Promise.all([
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.pedido.count(),
      prisma.pedido.count({ where: { status: 'disputa' } }),
      prisma.tecnico.count({ where: { status: 'pendente' } }),
    ]);

    const pagamentos = await prisma.pagamento.aggregate({
      _sum: { valor: true },
      where: { status: 'aprovado' },
    });

    return res.json({
      success: true,
      data: {
        totalUsuarios,
        totalPedidos,
        disputas,
        aprovacoes,
        receitaTotal: pagamentos._sum.valor ?? 0,
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar dashboard' });
  }
}
