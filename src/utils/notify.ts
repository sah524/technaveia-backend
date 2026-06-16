import prisma from './prisma';

/**
 * Cria uma notificação no banco para o usuário especificado.
 * Falha silenciosamente para não interromper fluxos principais.
 */
export async function createNotification(params: {
  usuarioId: string;
  tipo: string;     // 'request' | 'payment' | 'budget' | 'message' | 'system' | 'evaluation'
  titulo: string;
  descricao: string;
  actionUrl?: string;
}): Promise<void> {
  try {
    await prisma.notificacao.create({
      data: {
        usuarioId: params.usuarioId,
        tipo: params.tipo,
        titulo: params.titulo,
        descricao: params.descricao,
        actionUrl: params.actionUrl,
      },
    });
  } catch (e) {
    console.warn('⚠️ Erro ao criar notificação:', e);
  }
}
