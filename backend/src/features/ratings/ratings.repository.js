// Acesso ao banco das avaliações (Prisma), sem regra de negócio.
// As consultas devolvem só o que cada caso de uso precisa: as notas RECEBIDAS nunca
// trazem quem avaliou (o avaliado não pode descobrir quem deu cada nota).
import prisma from '../../db.js'

export const ratingsRepository = {
  // Cria a nota ou, se esse avaliador já avaliou esse jogador nessa partida, atualiza (edita, não duplica).
  salvar: ({ matchId, raterId, ratedId, score, comment }) =>
    prisma.rating.upsert({
      where: { matchId_raterId_ratedId: { matchId, raterId, ratedId } },
      create: { matchId, raterId, ratedId, score, comment },
      update: { score, comment },
      select: { id: true, matchId: true, ratedId: true, score: true, comment: true },
    }),

  listarDoAvaliador: (matchId, raterId) =>
    prisma.rating.findMany({
      where: { matchId, raterId },
      select: { raterId: true, ratedId: true, score: true, comment: true },
      orderBy: { ratedId: 'asc' },
    }),

  listarDaPartida: (matchId) =>
    prisma.rating.findMany({ where: { matchId }, select: { ratedId: true, score: true } }),

  // Notas recebidas por vários jogadores de uma vez (força de cada um no sorteio de times).
  listarRecebidasDe: (ratedIds) =>
    prisma.rating.findMany({ where: { ratedId: { in: ratedIds } }, select: { ratedId: true, score: true } }),

  listarRecebidas: (ratedId) =>
    prisma.rating.findMany({ where: { ratedId }, select: { matchId: true, score: true } }),
}
