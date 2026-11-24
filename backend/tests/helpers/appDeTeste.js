// Monta o app COMPLETO (guardas, rotas, serviços, errorHandler) trocando só o que é lento
// ou externo: banco (repositórios em memória) e custo do bcrypt (4 em vez de 10).
import { criarApp } from '../../src/criarApp.js'
import { criarAuthService } from '../../src/features/auth/auth.service.js'
import { criarHasher } from '../../src/features/auth/hasher.js'
import { criarTokens } from '../../src/features/auth/tokens.js'
import { criarPlayersService } from '../../src/features/players/players.service.js'
import { criarMatchesService } from '../../src/features/matches/matches.service.js'
import { criarStatsService } from '../../src/features/stats/stats.service.js'
import { criarRatingsService } from '../../src/features/ratings/ratings.service.js'
import { criarDrawService } from '../../src/features/draw/draw.service.js'
import { criarGroupsService } from '../../src/features/groups/groups.service.js'
import { criarAttendanceService } from '../../src/features/attendance/attendance.service.js'
import { BusinessRuleError } from '../../src/errors/AppError.js'

export const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!'

export function criarUsersRepoEmMemoria() {
  let proximoId = 1
  const usuarios = []
  const copia = (u) => u && { ...u }
  return {
    usuarios,
    buscarPorEmail: async (email) => copia(usuarios.find((u) => u.email === email)) ?? null,
    buscarPorId: async (id) => copia(usuarios.find((u) => u.id === id)) ?? null,
    criar: async (dados) => {
      const usuario = { id: proximoId++, ...dados }
      usuarios.push(usuario)
      return copia(usuario)
    },
  }
}

// Jogadores iniciais sem grupo informado ficam no grupo 1 (o grupo de teste).
export function criarPlayersRepoEmMemoria(iniciais = []) {
  let proximoId = iniciais.length + 1
  const jogadores = iniciais.map((j) => ({ groupId: 1, ...j }))
  return {
    jogadores,
    listar: async ({ groupId }) => jogadores.filter((j) => j.groupId === groupId),
    buscarPorId: async (id) => jogadores.find((j) => j.id === id) ?? null,
    buscarPorIds: async (ids) => jogadores.filter((j) => ids.includes(j.id)),
    buscarPorNicknameKey: async (groupId, key) =>
      jogadores.find((j) => j.groupId === groupId && j.nicknameKey === key) ?? null,
    criar: async (dados) => {
      const jogador = { id: proximoId++, active: true, ...dados }
      jogadores.push(jogador)
      return jogador
    },
    atualizar: async (id, dados) => Object.assign(jogadores.find((j) => j.id === id), dados),
    excluir: async () => {},
    possuiPartidas: async () => false,
  }
}

// Repositório em memória das partidas. Como o real, devolve a partida com a escalação e os gols.
export function criarMatchesRepoEmMemoria() {
  let proximoId = 1
  let proximoGolId = 1
  let proximoEventoId = 1
  let proximoJogoId = 1
  const partidas = []
  return {
    partidas,
    listar: async (groupId) => partidas.filter((p) => p.groupId === groupId),
    listarFinalizadas: async (groupId) => partidas.filter((p) => p.groupId === groupId && p.status === 'FINISHED'),
    buscarPorId: async (id) => partidas.find((p) => p.id === id) ?? null,
    criar: async (dados) => {
      const partida = { id: proximoId++, status: 'SCHEDULED', players: [], goals: [], events: [], games: [], ...dados }
      partidas.push(partida)
      return partida
    },
    atualizarDados: async (id, dados) => Object.assign(partidas.find((p) => p.id === id), dados),
    substituirEscalacao: async (id, escalacao) =>
      Object.assign(partidas.find((p) => p.id === id), { players: escalacao.map((e) => ({ matchId: id, ...e })) }),
    mudarStatus: async (id, { para, dados = {} }) =>
      Object.assign(partidas.find((p) => p.id === id), { ...dados, status: para }),
    criarGol: async ({ matchId, ...gol }) => {
      const novo = { id: proximoGolId++, matchId, ...gol }
      partidas.find((p) => p.id === matchId).goals.push(novo)
      return novo
    },
    removerGol: async (goalId) => {
      for (const p of partidas) p.goals = p.goals.filter((g) => g.id !== goalId)
    },
    criarEvento: async ({ matchId, ...evento }) => {
      const novo = { id: proximoEventoId++, matchId, ...evento }
      partidas.find((p) => p.id === matchId).events.push(novo)
      return novo
    },
    removerEvento: async (eventId) => {
      for (const p of partidas) p.events = p.events.filter((e) => e.id !== eventId)
    },
    criarJogo: async ({ matchId, ...jogo }) => {
      const novo = { id: proximoJogoId++, matchId, result: null, finishedAt: null, ...jogo }
      partidas.find((p) => p.id === matchId).games.push(novo)
      return novo
    },
    encerrarJogo: async (gameId, dados) => {
      for (const p of partidas) for (const j of p.games) if (j.id === gameId) Object.assign(j, dados)
    },
  }
}

// Repositório em memória da lista de presença. Como o real, confirmar de novo não duplica
// e traz o jogador (apelido e posição) de cada presença.
export function criarAttendanceRepoEmMemoria({ playersRepo, relogio = () => new Date() }) {
  const presencas = []
  return {
    presencas,
    listarDaPartida: async (matchId) =>
      presencas
        .filter((p) => p.matchId === matchId)
        .map((p) => {
          const j = playersRepo.jogadores.find((x) => x.id === p.playerId)
          return { ...p, player: { id: j.id, nickname: j.nickname, position: j.position } }
        }),
    adicionar: async ({ matchId, playerId }) => {
      if (!presencas.some((p) => p.matchId === matchId && p.playerId === playerId)) {
        presencas.push({ matchId, playerId, createdAt: relogio() })
      }
    },
    remover: async ({ matchId, playerId }) => {
      const i = presencas.findIndex((p) => p.matchId === matchId && p.playerId === playerId)
      if (i >= 0) presencas.splice(i, 1)
    },
  }
}

// Repositório em memória das avaliações. Como o real, `salvar` cria ou edita (uma nota por trio).
export function criarRatingsRepoEmMemoria() {
  let proximoId = 1
  const notas = []
  return {
    notas,
    salvar: async ({ matchId, raterId, ratedId, score, comment }) => {
      let nota = notas.find((n) => n.matchId === matchId && n.raterId === raterId && n.ratedId === ratedId)
      if (nota) Object.assign(nota, { score, comment })
      else notas.push((nota = { id: proximoId++, matchId, raterId, ratedId, score, comment }))
      return { id: nota.id, matchId, ratedId, score, comment }
    },
    listarDoAvaliador: async (matchId, raterId) =>
      notas.filter((n) => n.matchId === matchId && n.raterId === raterId).sort((a, b) => a.ratedId - b.ratedId),
    listarDaPartida: async (matchId) => notas.filter((n) => n.matchId === matchId),
    listarRecebidas: async (ratedId) => notas.filter((n) => n.ratedId === ratedId),
    listarRecebidasDe: async (ids) => notas.filter((n) => ids.includes(n.ratedId)),
  }
}

// Repositório em memória dos grupos e participações. Como o real, cria o jogador junto
// (no repositório de jogadores) e barra apelido repetido dentro do grupo.
export function criarGroupsRepoEmMemoria({ usersRepo, playersRepo }) {
  let proximoId = 1
  const grupos = []
  const participacoes = []
  const comPessoaEJogador = (p) => {
    const user = usersRepo.usuarios.find((u) => u.id === p.userId)
    const player = playersRepo.jogadores.find((j) => j.id === p.playerId)
    return { ...p, user: { id: user.id, name: user.name }, player: player ? { id: player.id, nickname: player.nickname } : null }
  }
  async function criarJogador(groupId, jogador) {
    if (playersRepo.jogadores.some((j) => j.groupId === groupId && j.nicknameKey === jogador.nicknameKey)) {
      throw new BusinessRuleError('Apelido já está em uso neste grupo')
    }
    return playersRepo.criar({ ...jogador, groupId })
  }
  const repo = {
    grupos,
    participacoes,
    // Atalho dos testes: cria um grupo direto, sem passar pela API.
    adicionarGrupo: (dados) => {
      const grupo = { id: proximoId++, ...dados }
      grupos.push(grupo)
      return grupo
    },
    buscarPorId: async (id) => grupos.find((g) => g.id === id) ?? null,
    buscarPorCodigo: async (codigo) => {
      const grupo = grupos.find((g) => g.inviteCode === codigo)
      return grupo ? { ...grupo, _count: { memberships: participacoes.filter((p) => p.groupId === grupo.id).length } } : null
    },
    listarDoUsuario: async (userId) =>
      participacoes.filter((p) => p.userId === userId).map((p) => ({ ...p, group: grupos.find((g) => g.id === p.groupId) })),
    buscarParticipacao: async (groupId, userId) =>
      participacoes.find((p) => p.groupId === groupId && p.userId === userId) ?? null,
    buscarParticipacaoPorJogador: async (playerId) => participacoes.find((p) => p.playerId === playerId) ?? null,
    listarMembros: async (groupId) => participacoes.filter((p) => p.groupId === groupId).map(comPessoaEJogador),
    contarOrganizadores: async (groupId) =>
      participacoes.filter((p) => p.groupId === groupId && p.role === 'ORGANIZER').length,
    criarComOrganizador: async ({ name, inviteCode, userId, jogador }) => {
      const grupo = { id: proximoId++, name, inviteCode }
      grupos.push(grupo)
      const player = jogador ? await criarJogador(grupo.id, jogador) : null
      const participacao = { groupId: grupo.id, userId, role: 'ORGANIZER', playerId: player?.id ?? null }
      participacoes.push(participacao)
      return { grupo, participacao }
    },
    entrar: async ({ groupId, userId, jogador }) => {
      const player = await criarJogador(groupId, jogador)
      const participacao = { groupId, userId, role: 'MEMBER', playerId: player.id }
      participacoes.push(participacao)
      return participacao
    },
    atualizarGrupo: async (id, dados) => Object.assign(grupos.find((g) => g.id === id), dados),
    atualizarParticipacao: async (groupId, userId, dados) =>
      comPessoaEJogador(Object.assign(participacoes.find((p) => p.groupId === groupId && p.userId === userId), dados)),
    removerParticipacao: async (groupId, userId) => {
      participacoes.splice(participacoes.findIndex((p) => p.groupId === groupId && p.userId === userId), 1)
    },
  }
  return repo
}

// `comGrupoDeTeste` (padrão): existe o grupo 1 e TODA conta criada já participa dele como MEMBER,
// como se tivesse entrado pelo convite. Para virar organizador ou ter jogador no teste:
//   ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
//   ctx.participacaoDe('ana@x.com').playerId = 3
// Os testes do próprio fluxo de grupos usam `comGrupoDeTeste: false` e criam tudo pela API.
export function montarApp({ expiraEmSegundos, jogadores = [], agora, aleatorio, gerarBytes, comGrupoDeTeste = true } = {}) {
  const usersRepo = criarUsersRepoEmMemoria()
  const playersRepo = criarPlayersRepoEmMemoria(jogadores)
  const matchesRepo = criarMatchesRepoEmMemoria()
  const ratingsRepo = criarRatingsRepoEmMemoria()
  const groupsRepo = criarGroupsRepoEmMemoria({ usersRepo, playersRepo })
  // Relógio da presença: cada confirmação 1 minuto depois da anterior (a ordem de chegada importa).
  let minuto = 0
  const attendanceRepo = criarAttendanceRepoEmMemoria({
    playersRepo,
    relogio: () => new Date(Date.UTC(2026, 10, 1, 12, minuto++)),
  })
  if (comGrupoDeTeste) {
    groupsRepo.adicionarGrupo({ name: 'Grupo de teste', inviteCode: 'TESTE234' })
    const criarUsuario = usersRepo.criar
    usersRepo.criar = async (dados) => {
      const usuario = await criarUsuario(dados)
      groupsRepo.participacoes.push({ groupId: 1, userId: usuario.id, role: 'MEMBER', playerId: null })
      return usuario
    }
  }
  const participacaoDe = (email) => {
    const usuario = usersRepo.usuarios.find((u) => u.email === email)
    return groupsRepo.participacoes.find((p) => p.groupId === 1 && p.userId === usuario.id)
  }
  const tokens = criarTokens({ obterSegredo: () => SEGREDO, expiraEmSegundos })
  const authService = criarAuthService({
    usersRepo,
    hasher: criarHasher({ custo: 4 }),
    tokens,
  })
  const app = criarApp({
    playersService: criarPlayersService(playersRepo),
    authService,
    matchesService: criarMatchesService({ matchesRepo, playersRepo, agora }),
    statsService: criarStatsService({ matchesRepo, playersRepo, agora }),
    ratingsService: criarRatingsService({ ratingsRepo, matchesRepo, playersRepo, agora }),
    drawService: criarDrawService({ playersRepo, ratingsRepo, aleatorio }),
    groupsService: criarGroupsService({ groupsRepo, playersRepo, ...(gerarBytes && { gerarBytes }) }),
    attendanceService: criarAttendanceService({ attendanceRepo, matchesRepo, playersRepo }),
    tokens,
  })
  return { app, usersRepo, playersRepo, matchesRepo, ratingsRepo, groupsRepo, attendanceRepo, participacaoDe, tokens }
}
