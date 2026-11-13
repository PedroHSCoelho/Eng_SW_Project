// Acesso ao banco das partidas (Prisma), sem regra de negócio.
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Escalação com o mínimo do jogador que a tela precisa.
const comEscalacao = {
  players: {
    include: { player: { select: { id: true, nickname: true, position: true } } },
    orderBy: [{ team: 'asc' }, { playerId: 'asc' }],
  },
}

export const matchesRepository = {
  listar: () => prisma.match.findMany({ orderBy: { date: 'desc' } }),

  buscarPorId: (id) => prisma.match.findUnique({ where: { id }, include: comEscalacao }),

  criar: (dados) => prisma.match.create({ data: dados, include: comEscalacao }),

  // Apaga a escalação antiga e grava a nova juntas (transação): nunca fica pela metade.
  substituirEscalacao: (matchId, escalacao) =>
    prisma.$transaction(async (tx) => {
      await tx.matchPlayer.deleteMany({ where: { matchId } })
      await tx.matchPlayer.createMany({ data: escalacao.map((e) => ({ matchId, ...e })) })
      return tx.match.findUnique({ where: { id: matchId }, include: comEscalacao })
    }),

  // Troca o status só se ele ainda for o esperado (`de`). Se duas requisições
  // tentarem ao mesmo tempo, a segunda encontra 0 linhas e vira erro de negócio.
  async mudarStatus(id, { de, para }) {
    const { count } = await prisma.match.updateMany({ where: { id, status: de }, data: { status: para } })
    if (count === 0) throw new BusinessRuleError('A partida mudou de estado; recarregue e tente de novo')
    return prisma.match.findUnique({ where: { id }, include: comEscalacao })
  },
}
