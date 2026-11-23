// Acesso ao banco dos jogadores (Prisma). Só leitura/gravação, sem regra de negócio:
// as regras ficam em players.service.js. Prisma parametriza tudo (sem SQL concatenado).
import { Prisma } from '@prisma/client'
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Duas requisições simultâneas podem passar pela checagem do serviço ao mesmo tempo;
// o @unique do banco é a barreira final (código P2002) e vira o mesmo erro de negócio.
function traduzirErroDeUnicidade(erro) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    throw new BusinessRuleError('Apelido já está em uso')
  }
  throw erro
}

export const playersRepository = {
  listar({ busca, apenasAtivos }) {
    return prisma.player.findMany({
      where: {
        ...(apenasAtivos && { active: true }),
        ...(busca && {
          OR: [
            { name: { contains: busca, mode: 'insensitive' } },
            { nickname: { contains: busca, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    })
  },

  buscarPorId(id) {
    return prisma.player.findUnique({ where: { id } })
  },

  // Usado pela escalação (módulo matches) para conferir vários jogadores de uma vez.
  buscarPorIds(ids) {
    return prisma.player.findMany({ where: { id: { in: ids } } })
  },

  buscarPorNicknameKey(nicknameKey) {
    return prisma.player.findUnique({ where: { nicknameKey } })
  },

  async criar(dados) {
    try {
      return await prisma.player.create({ data: dados })
    } catch (erro) {
      traduzirErroDeUnicidade(erro)
    }
  },

  async atualizar(id, dados) {
    try {
      return await prisma.player.update({ where: { id }, data: dados })
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
