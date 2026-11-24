// Acesso ao banco da lista de presença (Prisma), sem regra de negócio.
import prisma from '../../db.js'

export const attendanceRepository = {
  // Com o mínimo do jogador que a lista mostra; a ordem de chegada é decidida no núcleo.
  listarDaPartida: (matchId) =>
    prisma.attendance.findMany({
      where: { matchId },
      include: { player: { select: { id: true, nickname: true, position: true } } },
    }),

  // Confirmar duas vezes não duplica nem perde o lugar na fila (a chave é matchId + playerId).
  adicionar: ({ matchId, playerId }) =>
    prisma.attendance.createMany({ data: [{ matchId, playerId }], skipDuplicates: true }),

  remover: ({ matchId, playerId }) => prisma.attendance.deleteMany({ where: { matchId, playerId } }),
}
