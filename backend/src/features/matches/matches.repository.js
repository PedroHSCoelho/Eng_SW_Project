// Acesso ao banco das partidas (Prisma), sem regra de negócio.
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Escalação e gols com o mínimo do jogador que a tela precisa.
const apelido = { select: { id: true, nickname: true } }
const comEscalacao = {
  players: {
    include: { player: { select: { id: true, nickname: true, position: true } } },
    orderBy: [{ team: 'asc' }, { playerId: 'asc' }],
  },
  goals: {
    include: { scorer: apelido, assist: apelido },
    orderBy: [{ minute: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  },
  // Cartões e defesas difíceis, na ordem em que foram lançados.
  events: { include: { player: apelido }, orderBy: { id: 'asc' } },
  // Jogos da pelada, na ordem da noite (vazio no jogo único).
  games: { orderBy: { number: 'asc' } },
}

export const matchesRepository = {
  // Com os gols (só o time de cada um): o serviço calcula o placar de cada partida da lista.
  listar: (groupId) =>
    prisma.match.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      // Quantos confirmaram presença: a lista mostra "8/12" sem carregar a lista inteira.
      include: { goals: { select: { team: true } }, _count: { select: { attendances: true, games: true } } },
    }),

  // Partidas finalizadas com escalação e gols (só os campos que o cálculo usa).
  // Alimenta estatísticas e ranking, que são derivados das súmulas.
  listarFinalizadas: (groupId) =>
    prisma.match.findMany({
      where: { groupId, status: 'FINISHED' },
      select: {
        id: true, status: true, result: true, date: true, location: true, format: true, teamCount: true, teamNames: true,
        players: { select: { playerId: true, team: true } },
        goals: { select: { scorerId: true, assistId: true, team: true, ownGoal: true, gameId: true } },
        games: { select: { id: true, number: true, homeTeam: true, awayTeam: true, result: true } },
        events: { select: { playerId: true, type: true } },
      },
      orderBy: { date: 'desc' },
    }),

  buscarPorId: (id) => prisma.match.findUnique({ where: { id }, include: comEscalacao }),

  criar: (dados) => prisma.match.create({ data: dados, include: comEscalacao }),

  // Apaga a escalação antiga e grava a nova juntas (transação): nunca fica pela metade.
  substituirEscalacao: (matchId, escalacao) =>
    prisma.$transaction(async (tx) => {
      await tx.matchPlayer.deleteMany({ where: { matchId } })
      await tx.matchPlayer.createMany({ data: escalacao.map((e) => ({ matchId, ...e })) })
      return tx.match.findUnique({ where: { id: matchId }, include: comEscalacao })
    }),

  // Substituição: quem entra vai para o time (criado na escalação ou mudado de time, de volta a campo);
  // quem sai fica marcado como fora de campo (benched), sem sair da súmula.
  substituir: (matchId, { entra, sai }) =>
    prisma.$transaction(async (tx) => {
      if (sai !== null) {
        await tx.matchPlayer.update({ where: { matchId_playerId: { matchId, playerId: sai } }, data: { benched: true } })
      }
      if (entra !== null) {
        await tx.matchPlayer.upsert({
          where: { matchId_playerId: { matchId, playerId: entra.playerId } },
          create: { matchId, playerId: entra.playerId, team: entra.team },
          update: { team: entra.team, benched: false },
        })
      }
      return tx.match.findUnique({ where: { id: matchId }, include: comEscalacao })
    }),

  // Muda data e local só se a partida ainda estiver agendada (se alguém a iniciou ao mesmo tempo, 0 linhas).
  async atualizarDados(id, dados) {
    const { count } = await prisma.match.updateMany({ where: { id, status: 'SCHEDULED' }, data: dados })
    if (count === 0) throw new BusinessRuleError('A partida mudou de estado; recarregue e tente de novo')
    return prisma.match.findUnique({ where: { id }, include: comEscalacao })
  },

  // Troca o status só se ele ainda for o esperado (`de`). Se duas requisições
  // tentarem ao mesmo tempo, a segunda encontra 0 linhas e vira erro de negócio.
  // `dados` grava junto o que muda na transição (ex.: resultado ao encerrar).
  async mudarStatus(id, { de, para, dados = {} }) {
    const { count } = await prisma.match.updateMany({
      where: { id, status: de },
      data: { ...dados, status: para },
    })
    if (count === 0) throw new BusinessRuleError('A partida mudou de estado; recarregue e tente de novo')
    return prisma.match.findUnique({ where: { id }, include: comEscalacao })
  },

  criarGol: (dados) => prisma.goal.create({ data: dados }),

  removerGol: (goalId) => prisma.goal.delete({ where: { id: goalId } }),

  criarEvento: (dados) => prisma.matchEvent.create({ data: dados }),

  removerEvento: (eventId) => prisma.matchEvent.delete({ where: { id: eventId } }),

  // O índice único parcial (um jogo aberto por partida) barra dois "começar jogo" ao mesmo tempo.
  async criarJogo(dados) {
    try {
      return await prisma.matchGame.create({ data: dados })
    } catch (erro) {
      if (erro.code === 'P2002') throw new BusinessRuleError('Já existe um jogo aberto; recarregue a súmula')
      throw erro
    }
  },

  // Encerra só se ainda estiver aberto (dois cliques ao mesmo tempo não gravam duas vezes).
  async encerrarJogo(gameId, { result, finishedAt }) {
    const { count } = await prisma.matchGame.updateMany({ where: { id: gameId, finishedAt: null }, data: { result, finishedAt } })
    if (count === 0) throw new BusinessRuleError('O jogo já foi encerrado; recarregue a súmula')
  },
}
