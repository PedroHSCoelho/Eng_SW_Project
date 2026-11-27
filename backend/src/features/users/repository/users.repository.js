// Acesso ao banco dos usuários (Prisma), sem regra de negócio. Só o que o login precisa:
// papel e jogador agora ficam na participação de cada grupo (módulo groups).
import { Prisma } from '@prisma/client'
import prisma from '../../../db.js'
import { BusinessRuleError } from '../../../errors/AppError.js'

function ehViolacaoDeUnicidade(erro) {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002'
}

export const usersRepository = {
  buscarPorEmail: (email) => prisma.user.findUnique({ where: { email } }),
  buscarPorId: (id) => prisma.user.findUnique({ where: { id } }),

  // O @unique do e-mail é a barreira final contra dois cadastros simultâneos.
  async criar(dados) {
    try {
      return await prisma.user.create({ data: dados })
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) throw new BusinessRuleError('E-mail já cadastrado')
      throw erro
    }
  },
}
