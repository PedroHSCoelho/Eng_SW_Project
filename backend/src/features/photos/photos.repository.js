// Acesso ao banco das fotos (Prisma). A foto fica numa tabela só dela (PlayerPhoto), e não numa
// coluna de Player: assim as consultas de jogadores (lista, escalação, ranking...) nunca carregam
// os bytes da imagem sem querer.
import prisma from '../../db.js'

export const photosRepository = {
  listarDoGrupo(groupId) {
    return prisma.playerPhoto.findMany({
      where: { player: { groupId } },
      select: { playerId: true, updatedAt: true },
    })
  },

  buscar(playerId) {
    return prisma.playerPhoto.findUnique({ where: { playerId } })
  },

  // Cria ou substitui (cada jogador tem no máximo uma foto).
  salvar(playerId, { mimeType, data }) {
    return prisma.playerPhoto.upsert({
      where: { playerId },
      create: { playerId, mimeType, data },
      update: { mimeType, data },
      select: { playerId: true, updatedAt: true },
    })
  },

  // deleteMany não dá erro se o jogador já estava sem foto.
  async remover(playerId) {
    await prisma.playerPhoto.deleteMany({ where: { playerId } })
  },
}
