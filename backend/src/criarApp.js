// Monta o Express recebendo os serviços prontos. Separado do app.js para que os testes
// montem o app COMPLETO (rotas + guardas + errorHandler) com repositórios em memória.
import express, { Router } from 'express'
import healthRouter from './routes/health.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import {
  criarAutenticar,
  criarCarregarParticipacao,
  exigirOrganizadorDoGrupo,
  exigirOrganizadorDoGrupoParaEscrever,
} from './middlewares/auth.js'
import { criarPlayersRouter } from './features/players/players.routes.js'
import { criarAuthRouter } from './features/auth/auth.routes.js'
import { criarMatchesRouter } from './features/matches/matches.routes.js'
import { criarStatsRouter } from './features/stats/stats.routes.js'
import { criarCraqueRouter } from './features/craque/craque.routes.js'
import { criarDrawRouter } from './features/draw/draw.routes.js'
import { criarAttendanceRouter } from './features/attendance/attendance.routes.js'
import { criarConvitesRouter, criarGroupRouter, criarGroupsRouter } from './features/groups/groups.routes.js'

export function criarApp({
  playersService,
  authService,
  matchesService,
  statsService,
  craqueService,
  drawService,
  groupsService,
  attendanceService,
  tokens,
  cookieSeguro = false,
}) {
  const app = express()
  const autenticar = criarAutenticar(authService)
  const carregarParticipacao = criarCarregarParticipacao(groupsService)

  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use(
    '/api/auth',
    criarAuthRouter(authService, {
      autenticar,
      expiraEmSegundos: tokens.expiraEmSegundos,
      cookieSeguro,
    }),
  )
  // Dentro de um grupo: toda rota passa por login + participação (req.participacao), e quem pode
  // escrever é o organizador DESTE grupo. Vem ANTES de /api/grupos: "/api/grupos" sozinho não casa
  // com ":grupoId" e cai no router de baixo.
  const dentroDoGrupo = Router({ mergeParams: true })
  // O grupo em si: ver, renomear, convite, membros.
  dentroDoGrupo.use('/', criarGroupRouter(groupsService, { exigirOrganizadorDoGrupo }))
  // Votação do craque: quem jogou vota. Vem ANTES de /matches, que bloqueia escrita de quem não é
  // admin; este router só responde pelos próprios caminhos.
  dentroDoGrupo.use('/', criarCraqueRouter(craqueService))
  // Lista de presença: cada membro confirma o próprio nome; o organizador mexe em qualquer um.
  // Também ANTES de /matches, pelo mesmo motivo.
  dentroDoGrupo.use('/', criarAttendanceRouter(attendanceService))
  // Jogadores e partidas: qualquer participante vê; só organizador cria, edita, escala, lança gols e encerra.
  dentroDoGrupo.use('/players', exigirOrganizadorDoGrupoParaEscrever, criarPlayersRouter(playersService))
  dentroDoGrupo.use('/matches', exigirOrganizadorDoGrupoParaEscrever, criarMatchesRouter(matchesService))
  // Estatísticas do jogador e rankings: derivados das súmulas do grupo, só leitura.
  dentroDoGrupo.use('/', criarStatsRouter(statsService))
  // Sorteio de times: só o organizador (é ele quem monta a partida com o resultado).
  dentroDoGrupo.use('/sorteio', exigirOrganizadorDoGrupo, criarDrawRouter(drawService))
  app.use('/api/grupos/:grupoId', autenticar, carregarParticipacao, dentroDoGrupo)

  // Criar grupo, listar os meus e entrar por convite: qualquer pessoa logada.
  app.use('/api/grupos', autenticar, criarGroupsRouter(groupsService))
  app.use('/api/convites', autenticar, criarConvitesRouter(groupsService))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
