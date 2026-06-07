import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../utils/prisma'

const router = Router()
router.use(authMiddleware)

// ── GET /v1/budgets ───────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { pedidoId } = req.query

    const orcamentos = await prisma.orcamento.findMany({
      where: { ...(pedidoId && { pedidoId: pedidoId as string }) },
      include: {
        itens: true,
        tecnico: { include: { usuario: { select: { nome: true, foto: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ success: true, data: orcamentos })
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao listar orçamentos' })
  }
})

// ── POST /v1/budgets ──────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { pedidoId, itens, prazoExecucao, validade, observacoes, garantias } = req.body

    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } })
    if (!tecnico) {
      return res.status(403).json({ success: false, message: 'Apenas técnicos podem enviar orçamentos' })
    }

    const total = itens.reduce(
      (acc: number, i: { valor: number; quantidade: number }) => acc + i.valor * i.quantidade,
      0
    )

    const orcamento = await prisma.orcamento.create({
      data: {
        pedidoId,
        tecnicoId: tecnico.id,
        total,
        prazoExecucao,
        validade: new Date(validade),
        observacoes,
        garantias,
        itens: { create: itens },
      },
      include: { itens: true },
    })

    return res.status(201).json({ success: true, data: orcamento })
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao criar orçamento' })
  }
})

// ── PATCH /v1/budgets/:id/accept ─────────────────────────

router.patch('/:id/accept', async (req: AuthRequest, res: Response) => {
  try {
    const orcamento = await prisma.orcamento.findUnique({
      where: { id: req.params.id as string },
      include: { pedido: true },
    })

    if (!orcamento) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado' })
    }

    if (orcamento.pedido?.clienteId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Apenas o cliente do pedido pode aceitar orçamentos' })
    }

    if (orcamento.status !== 'pendente') {
      return res.status(400).json({ success: false, message: 'Este orçamento não está mais pendente' })
    }

    const updated = await prisma.orcamento.update({
      where: { id: req.params.id as string },
      data: { status: 'aceito' },
    })

    return res.json({ success: true, data: updated })
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao aceitar orçamento' })
  }
})

// ── PATCH /v1/budgets/:id/reject ─────────────────────────

router.patch('/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const orcamento = await prisma.orcamento.findUnique({
      where: { id: req.params.id as string },
      include: { pedido: true },
    })

    if (!orcamento) {
      return res.status(404).json({ success: false, message: 'Orçamento não encontrado' })
    }

    if (orcamento.pedido?.clienteId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Apenas o cliente do pedido pode recusar orçamentos' })
    }

    if (orcamento.status !== 'pendente') {
      return res.status(400).json({ success: false, message: 'Este orçamento não está mais pendente' })
    }

    const updated = await prisma.orcamento.update({
      where: { id: req.params.id as string },
      data: { status: 'recusado' },
    })

    return res.json({ success: true, data: updated })
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao recusar orçamento' })
  }
})

export default router
