// Acesso ao banco dos votos de craque (Prisma), sem regra de negócio.
import prisma from '../../../db.js'

export const craqueRepository = {
  listarDaPartida: (matchId) => prisma.mvpVote.findMany({ where: { matchId } }),

  // Um voto por jogador e partida (a chave é matchId + voterId): votar de novo troca o voto.
  votar: ({ matchId, voterId, votedId }) =>
    prisma.mvpVote.upsert({
      where: { matchId_voterId: { matchId, voterId } },
      create: { matchId, voterId, votedId },
      update: { votedId },
    }),
}
