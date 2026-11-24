// Acesso ao banco dos grupos e das participações (Prisma), sem regra de negócio.
import { Prisma } from '@prisma/client'
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Só o necessário para a tela de membros (nunca e-mail nem hash da senha).
const comPessoaEJogador = {
  user: { select: { id: true, name: true } },
  player: { select: { id: true, nickname: true } },
}

// Os @unique do banco são a barreira final contra duas requisições ao mesmo tempo (código P2002).
// `meta.target` diz qual restrição foi violada, para a mensagem certa.
function traduzirUnicidade(erro) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    const alvo = String(erro.meta?.target ?? '')
    if (alvo.includes('nicknameKey')) throw new BusinessRuleError('Apelido já está em uso neste grupo')
    if (alvo.includes('inviteCode')) throw new BusinessRuleError('Não foi possível gerar o convite; tente de novo')
    if (alvo.includes('playerId')) throw new BusinessRuleError('Jogador já está vinculado a outra pessoa')
    throw new BusinessRuleError('Você já participa deste grupo')
  }
  throw erro
}

export const groupsRepository = {
  buscarPorId: (id) => prisma.group.findUnique({ where: { id } }),

  buscarPorCodigo: (inviteCode) =>
    prisma.group.findUnique({ where: { inviteCode }, include: { _count: { select: { memberships: true } } } }),

  // Grupos de que a pessoa participa, com o papel dela em cada um.
  listarDoUsuario: (userId) =>
    prisma.membership.findMany({
      where: { userId },
      include: { group: true },
      orderBy: { group: { name: 'asc' } },
    }),

  buscarParticipacao: (groupId, userId) =>
    prisma.membership.findUnique({ where: { groupId_userId: { groupId, userId } } }),

  buscarParticipacaoPorJogador: (playerId) => prisma.membership.findUnique({ where: { playerId } }),

  listarMembros: (groupId) =>
    prisma.membership.findMany({
      where: { groupId },
      include: comPessoaEJogador,
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
    }),

  contarOrganizadores: (groupId) => prisma.membership.count({ where: { groupId, role: 'ORGANIZER' } }),

  // Grupo + participação de quem criou (+ o jogador dela, se informado), tudo numa transação.
  async criarComOrganizador({ name, inviteCode, userId, jogador }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const grupo = await tx.group.create({ data: { name, inviteCode } })
        const player = jogador ? await tx.player.create({ data: { ...jogador, groupId: grupo.id } }) : null
        const participacao = await tx.membership.create({
          data: { groupId: grupo.id, userId, role: 'ORGANIZER', playerId: player?.id ?? null },
        })
        return { grupo, participacao }
      })
    } catch (erro) {
      traduzirUnicidade(erro)
    }
  },

  // Entrar pelo convite: cria o jogador da pessoa no grupo e a participação, juntos.
  async entrar({ groupId, userId, jogador }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const player = await tx.player.create({ data: { ...jogador, groupId } })
        return tx.membership.create({ data: { groupId, userId, role: 'MEMBER', playerId: player.id } })
      })
    } catch (erro) {
      traduzirUnicidade(erro)
    }
  },

  atualizarGrupo: async (id, dados) => {
    try {
      return await prisma.group.update({ where: { id }, data: dados })
    } catch (erro) {
      traduzirUnicidade(erro)
    }
  },

  async atualizarParticipacao(groupId, userId, dados) {
    try {
      return await prisma.membership.update({
        where: { groupId_userId: { groupId, userId } },
        data: dados,
        include: comPessoaEJogador,
      })
    } catch (erro) {
      traduzirUnicidade(erro)
    }
  },

  // O jogador da pessoa continua no grupo (o histórico dele não some); só a participação sai.
  removerParticipacao: (groupId, userId) =>
    prisma.membership.delete({ where: { groupId_userId: { groupId, userId } } }),
}
