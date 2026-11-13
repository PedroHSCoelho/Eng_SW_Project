// Acesso ao banco dos usuários (Prisma), sem regra de negócio.
import { Prisma } from '@prisma/client'
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Devolve junto o jogador vinculado (só o necessário para a tela de gestão).
const comJogador = { player: { select: { id: true, name: true, nickname: true } } }

function ehViolacaoDeUnicidade(erro) {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002'
}

export const usersRepository = {
  buscarPorEmail: (email) => prisma.user.findUnique({ where: { email }, include: comJogador }),
  buscarPorId: (id) => prisma.user.findUnique({ where: { id }, include: comJogador }),
  buscarPorPlayerId: (playerId) => prisma.user.findUnique({ where: { playerId } }),
  listar: () => prisma.user.findMany({ include: comJogador, orderBy: { name: 'asc' } }),
  contarOrganizadores: () => prisma.user.count({ where: { role: 'ORGANIZER' } }),

  // O @unique do e-mail é a barreira final contra dois cadastros simultâneos.
  async criar(dados) {
    try {
      return await prisma.user.create({ data: dados, include: comJogador })
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) throw new BusinessRuleError('E-mail já cadastrado')
      throw erro
    }
  },

  // Só role e playerId mudam aqui; o único @unique envolvido é o do playerId.
  async atualizar(id, dados) {
    try {
      return await prisma.user.update({ where: { id }, data: dados, include: comJogador })
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new BusinessRuleError('Jogador já está vinculado a outro usuário')
      }
      throw erro
    }
  },
}
