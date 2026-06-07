import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

// Tipagens locais
interface AvaliacaoRecord {
  nota: number;
}

interface TecnicoRecord {
  id: string;
  avaliacao?: number;
  totalAvaliacoes?: number;
}

// UUID curto + timestamp para garantir unicidade do número de pedido
function gerarNumeroPedido(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `#${timestamp}${random}`;
}

// ── GET /v1/orders ────────────────────────────────────────

export async function listOrders(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = {};

    if (req.userRole === 'cliente') {
      where.clienteId = req.userId;
    } else if (req.userRole === 'tecnico') {
      const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
      if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });
      where.tecnicoId = tecnico.id;
    }
    // admin pode ver todos (sem filtro adicional)

    if (status) where.status = status;

    const orders = await prisma.pedido.findMany({
      where,
      include: {
        tecnico: { include: { usuario: { select: { nome: true, foto: true } } } },
        cliente: { select: { nome: true, foto: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao listar pedidos' });
  }
}

// ── GET /v1/orders/:id ────────────────────────────────────

export async function getOrder(req: AuthRequest, res: Response) {
  try {
    const order = await prisma.pedido.findUnique({
      where: { id: req.params.id as string },
      include: {
        tecnico: { include: { usuario: { select: { nome: true, foto: true, telefone: true } } } },
        cliente: { select: { nome: true, foto: true, telefone: true } },
        orcamentos: { include: { itens: true } },
        pagamento: true,
        avaliacao: true,
      },
    });

    if (!order) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });

    // Verifica acesso: cliente dono, técnico vinculado ou admin
    const tecnico = req.userRole === 'tecnico'
      ? await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } })
      : null;

    const temAcesso =
      req.userRole === 'admin' ||
      order.clienteId === req.userId ||
      (tecnico && order.tecnicoId === tecnico.id);

    if (!temAcesso) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    return res.json({ success: true, data: order });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar pedido' });
  }
}

// ── POST /v1/orders ───────────────────────────────────────

export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const {
      categoria, subcategoria, descricao, modalidade,
      endereco, dataAgendada, isUrgente, valorEstimado,
      fotosUrls, tecnicoId,
    } = req.body;

    if (!categoria || !subcategoria || !descricao || !modalidade) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes: categoria, subcategoria, descricao, modalidade' });
    }

    const order = await prisma.pedido.create({
      data: {
        numero: gerarNumeroPedido(),
        clienteId: req.userId!,
        tecnicoId,
        categoria,
        subcategoria,
        descricao,
        modalidade,
        endereco,
        isUrgente: isUrgente ?? false,
        dataAgendada: dataAgendada ? new Date(dataAgendada) : undefined,
        valorEstimado,
        fotosUrls: fotosUrls ?? [],
        status: 'solicitado',
      },
    });

    return res.status(201).json({ success: true, data: order });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao criar pedido' });
  }
}

// ── PATCH /v1/orders/:id/status ───────────────────────────

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  try {
    const { status, valorFinal } = req.body;

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Id do pedido ausente' });

    const order = await prisma.pedido.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });

    // Verifica permissão por papel
    if (req.userRole === 'cliente') {
      // Cliente só pode cancelar ou confirmar conclusão
      const statusPermitidos = ['cancelado', 'concluido'];
      if (!statusPermitidos.includes(status)) {
        return res.status(403).json({ success: false, message: 'Ação não permitida para clientes' });
      }
      if (order.clienteId !== req.userId) {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      }
    } else if (req.userRole === 'tecnico') {
      const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
      if (!tecnico || order.tecnicoId !== tecnico.id) {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      }
    }
    // admin pode alterar qualquer status

    const updated = await prisma.pedido.update({
      where: { id },
      data: { status, ...(valorFinal !== undefined && { valorFinal }) },
    });

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
  }
}

// ── DELETE /v1/orders/:id ─────────────────────────────────

export async function cancelOrder(req: AuthRequest, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await prisma.pedido.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });

    // Somente o cliente dono ou admin podem cancelar
    if (req.userRole !== 'admin' && order.clienteId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Não permite cancelar pedidos já concluídos
    if (order.status === 'concluido') {
      return res.status(400).json({ success: false, message: 'Pedidos concluídos não podem ser cancelados' });
    }

    await prisma.pedido.update({
      where: { id },
      data: { status: 'cancelado' },
    });

    return res.json({ success: true, message: 'Pedido cancelado' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao cancelar pedido' });
  }
}

// ── POST /v1/orders/:id/review ────────────────────────────

export async function reviewOrder(req: AuthRequest, res: Response) {
  try {
    const { nota, pontualidade, qualidade, comunicacao, custobeneficio, comentario, recomenda } = req.body;

    if (!nota || nota < 1 || nota > 5) {
      return res.status(400).json({ success: false, message: 'Nota deve ser entre 1 e 5' });
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const order = await prisma.pedido.findUnique({ where: { id } });
    if (!order || !order.tecnicoId) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }

    // Apenas o cliente dono pode avaliar
    if (order.clienteId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Pedido deve estar concluído
    if (order.status !== 'concluido') {
      return res.status(400).json({ success: false, message: 'Apenas pedidos concluídos podem ser avaliados' });
    }

    // Verifica se já existe avaliação
    const existente = await prisma.avaliacao.findUnique({ where: { pedidoId: id } });
    if (existente) {
      return res.status(409).json({ success: false, message: 'Este pedido já foi avaliado' });
    }

    const review = await prisma.avaliacao.create({
      data: {
        pedidoId: id,
        clienteId: req.userId!,
        tecnicoId: order.tecnicoId,
        nota,
        pontualidade,
        qualidade,
        comunicacao,
        custobeneficio,
        comentario,
        recomenda: recomenda ?? true,
      },
    });

    // Atualiza média de avaliação do técnico
    const avaliacoes: AvaliacaoRecord[] = await prisma.avaliacao.findMany({ where: { tecnicoId: order.tecnicoId } }) as AvaliacaoRecord[];
    const media: number = avaliacoes.reduce((acc: number, a: AvaliacaoRecord) => acc + a.nota, 0) / avaliacoes.length;

    await prisma.tecnico.update({
      where: { id: order.tecnicoId },
      data: {
        avaliacao: Math.round(media * 10) / 10,
        totalAvaliacoes: avaliacoes.length,
      },
    });

    return res.status(201).json({ success: true, data: review });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao avaliar pedido' });
  }
}