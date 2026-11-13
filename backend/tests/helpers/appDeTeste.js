// Monta o app COMPLETO (guardas, rotas, serviços, errorHandler) trocando só o que é lento
// ou externo: banco (repositórios em memória) e custo do bcrypt (4 em vez de 10).
import { criarApp } from '../../src/criarApp.js'
import { criarAuthService } from '../../src/features/auth/auth.service.js'
import { criarHasher } from '../../src/features/auth/hasher.js'
import { criarTokens } from '../../src/features/auth/tokens.js'
import { criarPlayersService } from '../../src/features/players/players.service.js'
import { criarUsersService } from '../../src/features/users/users.service.js'
import { criarOrganizerRequestsService } from '../../src/features/organizerRequests/organizerRequests.service.js'
import { criarMatchesService } from '../../src/features/matches/matches.service.js'

export const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!'

export function criarUsersRepoEmMemoria() {
  let proximoId = 1
  const usuarios = []
  const comJogador = (u) => u && { ...u }
  return {
    usuarios,
    buscarPorEmail: async (email) => comJogador(usuarios.find((u) => u.email === email)) ?? null,
    buscarPorId: async (id) => comJogador(usuarios.find((u) => u.id === id)) ?? null,
    buscarPorPlayerId: async (playerId) => usuarios.find((u) => u.playerId === playerId) ?? null,
    listar: async () => usuarios.map(comJogador),
    contarOrganizadores: async () => usuarios.filter((u) => u.role === 'ORGANIZER').length,
    criar: async (dados) => {
      const usuario = { id: proximoId++, playerId: null, player: null, ...dados }
      usuarios.push(usuario)
      return comJogador(usuario)
    },
    atualizar: async (id, dados) => comJogador(Object.assign(usuarios.find((u) => u.id === id), dados)),
  }
}

// Repositório em memória dos pedidos. Comporta-se como o real: aprovar promove o usuário.
export function criarRequestsRepoEmMemoria(usersRepo) {
  let proximoId = 1
  const pedidos = []
  const comUsuario = (p) => ({ ...p, user: usersRepo.usuarios.find((u) => u.id === p.userId) })
  return {
    pedidos,
    buscarPorId: async (id) => pedidos.find((p) => p.id === id) ?? null,
    buscarUltimoDoUsuario: async (userId) =>
      [...pedidos].reverse().find((p) => p.userId === userId) ?? null,
    listar: async ({ status }) => pedidos.filter((p) => p.status === status).map(comUsuario),
    criar: async ({ userId, message }) => {
      const pedido = { id: proximoId++, userId, message, status: 'PENDING', createdAt: new Date(), decidedAt: null, decidedById: null }
      pedidos.push(pedido)
      return comUsuario(pedido)
    },
    aprovar: async ({ id, userId, decidedById }) => {
      const pedido = pedidos.find((p) => p.id === id)
      Object.assign(pedido, { status: 'APPROVED', decidedAt: new Date(), decidedById })
      usersRepo.usuarios.find((u) => u.id === userId).role = 'ORGANIZER'
      return comUsuario(pedido)
    },
    recusar: async ({ id, decidedById }) => {
      const pedido = pedidos.find((p) => p.id === id)
      Object.assign(pedido, { status: 'REJECTED', decidedAt: new Date(), decidedById })
      return comUsuario(pedido)
    },
  }
}

export function criarPlayersRepoEmMemoria(iniciais = []) {
  let proximoId = iniciais.length + 1
  const jogadores = [...iniciais]
  return {
    listar: async () => jogadores,
    buscarPorId: async (id) => jogadores.find((j) => j.id === id) ?? null,
    buscarPorIds: async (ids) => jogadores.filter((j) => ids.includes(j.id)),
    buscarPorNicknameKey: async (key) => jogadores.find((j) => j.nicknameKey === key) ?? null,
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

// Repositório em memória das partidas. Como o real, devolve a partida com a escalação.
export function criarMatchesRepoEmMemoria() {
  let proximoId = 1
  const partidas = []
  return {
    partidas,
    listar: async () => partidas,
    buscarPorId: async (id) => partidas.find((p) => p.id === id) ?? null,
    criar: async (dados) => {
      const partida = { id: proximoId++, status: 'SCHEDULED', players: [], ...dados }
      partidas.push(partida)
      return partida
    },
    substituirEscalacao: async (id, escalacao) =>
      Object.assign(partidas.find((p) => p.id === id), { players: escalacao.map((e) => ({ matchId: id, ...e })) }),
    mudarStatus: async (id, { para }) => Object.assign(partidas.find((p) => p.id === id), { status: para }),
  }
}

export function montarApp({ expiraEmSegundos, jogadores = [], agora } = {}) {
  const usersRepo = criarUsersRepoEmMemoria()
  const requestsRepo = criarRequestsRepoEmMemoria(usersRepo)
  const playersRepo = criarPlayersRepoEmMemoria(jogadores)
  const matchesRepo = criarMatchesRepoEmMemoria()
  const tokens = criarTokens({ obterSegredo: () => SEGREDO, expiraEmSegundos })
  const authService = criarAuthService({
    usersRepo,
    hasher: criarHasher({ custo: 4 }),
    tokens,
  })
  const app = criarApp({
    playersService: criarPlayersService(playersRepo),
    authService,
    usersService: criarUsersService({ usersRepo, playersRepo }),
    organizerRequestsService: criarOrganizerRequestsService({ requestsRepo, agora }),
    matchesService: criarMatchesService({ matchesRepo, playersRepo }),
    tokens,
  })
  return { app, usersRepo, requestsRepo, matchesRepo, tokens }
}
