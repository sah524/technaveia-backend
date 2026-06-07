import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

interface Transacao {
  status: string;
  tipo: string;
  valorLiquido: number;
  createdAt: Date | string;
}

interface Saque {
  valor: number;
  status: string;
}

interface ContaBancaria {
  chavePix?: string | null;
  banco: string;
  agencia: string;
  conta: string;
}

interface Tecnico {
  id: number;
  usuarioId: number;
  contaBancaria: ContaBancaria | null;
}

interface WithdrawRequestBody {
  valor?: number;
}

// ── GET /v1/finance/summary ───────────────────────────────

export async function getSummary(req: AuthRequest, res: Response) {
  try {
    const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId: req.userId } });
    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });

    const [transacoes, saques] = await Promise.all([
      prisma.transacao.findMany({
        where: { tecnicoId: tecnico.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.saque.findMany({
        where: { tecnicoId: tecnico.id, status: { in: ['processando', 'concluido'] } },
      }),
    ]);

    // Soma todos os créditos concluídos
    const totalCreditos = transacoes
      .filter((t: { status: string; tipo: string; }) => t.status === 'concluido' && t.tipo === 'credito')
      .reduce((acc: any, t: { valorLiquido: any; }) => acc + t.valorLiquido, 0);

    // Desconta saques já solicitados ou concluídos
    const totalSacado = saques.reduce((acc: number, s: { valor: number }) => acc + s.valor, 0);

    const saldoDisponivel = Math.max(0, totalCreditos - totalSacado);

    const saldoPendente = transacoes
      .filter((t: { status: string; tipo: string; }) => t.status === 'pendente' && t.tipo === 'credito')
      .reduce((acc: number, t: { valorLiquido: number }) => acc + t.valorLiquido, 0);

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0);

    const ganhosMes = transacoes
      .filter((t: { tipo: string; createdAt: Date | string; }) => t.tipo === 'credito' && new Date(t.createdAt) >= inicioMes)
      .reduce((acc: any, t: { valorLiquido: any; }) => acc + t.valorLiquido, 0);

    const ganhosMesAnterior = transacoes
      .filter(
        (t: { tipo: string; createdAt: Date | string; }) =>
          t.tipo === 'credito' &&
          new Date(t.createdAt) >= inicioMesAnterior &&
          new Date(t.createdAt) <= fimMesAnterior,
      )
      .reduce((acc: any, t: { valorLiquido: any; }) => acc + t.valorLiquido, 0);

    // Ganhos dos últimos 7 dias (um valor por dia)
    const ganhosSemana = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date();
      dia.setDate(dia.getDate() - (6 - i));
      dia.setHours(0, 0, 0, 0);
      const proxDia = new Date(dia);
      proxDia.setDate(dia.getDate() + 1);

      return transacoes
        .filter(
          (t: { tipo: string; createdAt: Date | string; }) =>
            t.tipo === 'credito' &&
            new Date(t.createdAt) >= dia &&
            new Date(t.createdAt) < proxDia,
        )
        .reduce((acc: any, t: { valorLiquido: any; }) => acc + t.valorLiquido, 0);
    });

    return res.json({
      success: true,
      data: {
        saldoDisponivel:    Math.round(saldoDisponivel * 100) / 100,
        saldoPendente:      Math.round(saldoPendente * 100) / 100,
        ganhosMes:          Math.round(ganhosMes * 100) / 100,
        ganhosMesAnterior:  Math.round(ganhosMesAnterior * 100) / 100,
        ganhosSemana,
        transacoes: transacoes.slice(0, 20),
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao buscar resumo financeiro' });
  }
}

// ── POST /v1/finance/withdraw ─────────────────────────────

export async function requestWithdraw(req: AuthRequest, res: Response) {
  try {
    const { valor } = req.body;

    if (!valor || valor < 10) {
      return res.status(400).json({ success: false, message: 'Valor mínimo para saque é R$ 10,00' });
    }

    const tecnico = await prisma.tecnico.findUnique({
      where: { usuarioId: req.userId },
      include: { contaBancaria: true },
    });

    if (!tecnico) return res.status(404).json({ success: false, message: 'Técnico não encontrado' });
    if (!tecnico.contaBancaria) {
      return res.status(400).json({ success: false, message: 'Dados bancários não cadastrados' });
    }

    // Verifica saldo disponível antes de criar o saque
    const [transacoes, saques] = await Promise.all([
      prisma.transacao.findMany({
        where: { tecnicoId: tecnico.id, status: 'concluido', tipo: 'credito' },
      }),
      prisma.saque.findMany({
        where: { tecnicoId: tecnico.id, status: { in: ['processando', 'concluido'] } },
      }),
    ]);

    const totalCreditos = transacoes.reduce((acc: number, t: { valorLiquido: number }) => acc + t.valorLiquido, 0);
    const totalSacado   = saques.reduce((acc: number, s: { valor: number }) => acc + s.valor, 0);
    const saldoDisponivel = Math.max(0, totalCreditos - totalSacado);

    if (valor > saldoDisponivel) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`,
      });
    }

    const conta = tecnico.contaBancaria.chavePix
      ? `PIX · ${tecnico.contaBancaria.chavePix}`
      : `${tecnico.contaBancaria.banco} · Ag. ${tecnico.contaBancaria.agencia} · Cc. ${tecnico.contaBancaria.conta}`;

    const saque = await prisma.saque.create({
      data: {
        tecnicoId: tecnico.id,
        valor,
        conta,
        status: 'processando',
      },
    });

    return res.status(201).json({ success: true, data: saque, prazo: '1-3 dias úteis' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao solicitar saque' });
  }
}