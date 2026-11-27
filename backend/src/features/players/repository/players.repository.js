// Acesso ao banco dos jogadores (Prisma). Só leitura/gravação, sem regra de negócio:
// as regras ficam em players.service.js. Prisma parametriza tudo (sem SQL concatenado).
import { Prisma } from '@prisma/client'
import prisma from '../../../db.js'
import { BusinessRuleError } from '../../../errors/AppError.js'

// Duas requisições simultâneas podem passar pela checagem do serviço ao mesmo tempo;
// o @unique do banco é a barreira final (código P2002) e vira o mesmo erro de negócio.
function traduzirErroDeUnicidade(erro) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    throw new BusinessRuleError('Apelido já está em uso')
  }
  throw erro
}

export const playersRepository = {
  // `comNota`: só para admin; a nota do admin vem escondida por padrão (ver db.js).
  // A busca por nome/apelido (sem acento) é feita no serviço, em cima desta lista.
  listar({ groupId, apenasAtivos, comNota = false }) {
    return prisma.player.findMany({
      omit: { skill: !comNota },
      where: {
        groupId,
        ...(apenasAtivos && { active: true }),
      },
      orderBy: { name: 'asc' },
    })
  },

  buscarPorId(id, { comNota = false } = {}) {
    return prisma.player.findUnique({ where: { id }, omit: { skill: !comNota } })
  },

  // Usado pela escalação (módulo matches) para conferir vários jogadores de uma vez.
  // O sorteio pede `comNota` (é a nota que equilibra os times).
  buscarPorIds(ids, { comNota = false } = {}) {
    return prisma.player.findMany({ where: { id: { in: ids } }, omit: { skill: !comNota } })
  },

  // O apelido é único dentro do grupo (@@unique([groupId, nicknameKey]) no schema).
  buscarPorNicknameKey(groupId, nicknameKey) {
    return prisma.player.findUnique({ where: { groupId_nicknameKey: { groupId, nicknameKey } } })
  },

  async criar(dados) {
    try {
      return await prisma.player.create({ data: dados })
    } catch (erro) {
      traduzirErroDeUnicidade(erro)
    }
  },

  async atualizar(id, dados, { comNota = false } = {}) {
    try {
      return await prisma.player.update({ where: { id }, data: dados, omit: { skill: !comNota } })
    } catch (erro) {
      traduzirErroDeUnicidade(erro)
    }
  },

  async excluir(id) {
    await prisma.player.delete({ where: { id } })
  },

  // Já foi escalado em alguma partida? (o onDelete: Restrict do MatchPlayer também barra no banco)
  async possuiPartidas(id) {
    return (await prisma.matchPlayer.count({ where: { playerId: id } })) > 0
  },
}
