// Acesso ao banco da lista de presença e dos convidados (Prisma), sem regra de negócio.
import prisma from '../../db.js'

export const attendanceRepository = {
  // Com o mínimo do jogador que a lista mostra; a ordem de chegada é decidida no núcleo.
  listarDaPartida: (matchId) =>
    prisma.attendance.findMany({
      where: { matchId },
      include: { player: { select: { id: true, nickname: true, position: true } } },
    }),

  // Entrar duas vezes não duplica nem perde o lugar na fila (a chave é matchId + playerId).
  adicionar: ({ matchId, playerId, maybe = false }) =>
    prisma.attendance.createMany({ data: [{ matchId, playerId, maybe }], skipDuplicates: true }),

  // Trocar entre confirmado e "talvez" vale como chegar agora (vai para o fim da fila).
  mudarTalvez: ({ matchId, playerId, maybe }) =>
    prisma.attendance.update({
      where: { matchId_playerId: { matchId, playerId } },
      data: { maybe, createdAt: new Date() },
    }),

  remover: ({ matchId, playerId }) => prisma.attendance.deleteMany({ where: { matchId, playerId } }),

  listarConvidados: (matchId) =>
    prisma.matchGuest.findMany({
      where: { matchId },
      include: { invitedBy: { select: { id: true, nickname: true } } },
    }),

  buscarConvidado: (id) => prisma.matchGuest.findUnique({ where: { id } }),

  adicionarConvidado: ({ matchId, name, invitedById }) =>
    prisma.matchGuest.create({ data: { matchId, name, invitedById } }),

  removerConvidado: (id) => prisma.matchGuest.delete({ where: { id } }),
}
