import { Router, Request, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../utils/prisma";
import { createNotification } from "../utils/notify";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const pedidoId = Array.isArray(req.query.pedidoId)
      ? req.query.pedidoId[0]
      : req.query.pedidoId;
    const orcamentos = await prisma.orcamento.findMany({
      where: { ...(pedidoId && { pedidoId }) },
      include: {
        itens: true,
        tecnico: {
          include: { usuario: { select: { nome: true, foto: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: orcamentos });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao listar orçamentos" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { pedidoId, itens, prazoExecucao, validade, observacoes, garantias } =
      req.body;
    const tecnico = await prisma.tecnico.findUnique({
      where: { usuarioId: req.userId },
    });
    if (!tecnico) {
      return res.status(403).json({
        success: false,
        message: "Apenas técnicos podem enviar orçamentos",
      });
    }
    if (!pedidoId || !itens?.length || !prazoExecucao) {
      return res.status(400).json({
        success: false,
        message: "pedidoId, itens e prazoExecucao são obrigatórios",
      });
    }
    const total = itens.reduce(
      (acc: number, i: any) => acc + i.valor * i.quantidade,
      0,
    );
    // validade padrão: 7 dias a partir de hoje se não fornecida
    const validadeDate = validade
      ? new Date(validade)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const orcamento = await prisma.orcamento.create({
      data: {
        pedidoId,
        tecnicoId: tecnico.id,
        total,
        prazoExecucao,
        validade: validadeDate,
        observacoes,
        garantias,
        itens: { create: itens },
      },
      include: { itens: true },
    });

    // Notifica o cliente que recebeu orçamento
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (pedido) {
      await createNotification({
        usuarioId: pedido.clienteId,
        tipo: 'budget',
        titulo: 'Novo orçamento recebido!',
        descricao: `Total: R$ ${total.toFixed(2).replace('.', ',')} — Prazo: ${prazoExecucao}`,
        actionUrl: `/budgets/${orcamento.id}`,
      });
    }

    return res.status(201).json({ success: true, data: orcamento });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao criar orçamento" });
  }
});

router.patch("/:id/accept", async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Id de orçamento inválido" });
    }
    const o = await prisma.orcamento.update({
      where: { id },
      data: { status: "aceito" },
    });
    return res.json({ success: true, data: o });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao aceitar orçamento" });
  }
});

router.patch("/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Id de orçamento inválido" });
    }
    const o = await prisma.orcamento.update({
      where: { id },
      data: { status: "recusado" },
    });
    return res.json({ success: true, data: o });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Erro ao recusar orçamento" });
  }
});

export default router;
