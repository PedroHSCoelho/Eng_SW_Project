// Monta o Express recebendo os serviços prontos. Separado do app.js para que os testes
// montem o app COMPLETO (rotas + guardas + errorHandler) com repositórios em memória.
import express from 'express'
import healthRouter from './routes/health.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { criarAutenticar, exigirPapel, exigirPapelParaEscrever } from './middlewares/auth.js'
import { criarPlayersRouter } from './features/players/players.routes.js'
import { criarAuthRouter } from './features/auth/auth.routes.js'
import { criarUsersRouter } from './features/users/users.routes.js'
import { criarOrganizerRequestsRouter } from './features/organizerRequests/organizerRequests.routes.js'
import { criarMatchesRouter } from './features/matches/matches.routes.js'
import { criarStatsRouter } from './features/stats/stats.routes.js'
import { criarRatingsRouter } from './features/ratings/ratings.routes.js'
import { criarDrawRouter } from './features/draw/draw.routes.js'

export function criarApp({
  playersService,
  authService,
  usersService,
  organizerRequestsService,
  matchesService,
  statsService,
  ratingsService,
  drawService,
  tokens,
  cookieSeguro = false,
}) {
  const app = express()
  const autenticar = criarAutenticar(authService)

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
  // Jogadores: qualquer logado lê; só organizador escreve.
  app.use(
    '/api/players',
    autenticar,
    exigirPapelParaEscrever('ORGANIZER'),
    criarPlayersRouter(playersService),
  )
  // Avaliações: qualquer logado avalia (se jogou a partida). Vem ANTES de /api/matches, que bloqueia
  // escrita de não organizador; este router só responde pelos próprios caminhos.
  app.use('/api', criarRatingsRouter(ratingsService, { autenticar }))
  // Partidas: qualquer logado vê; só organizador cria, escala, inicia, lança gols e encerra.
  app.use(
    '/api/matches',
    autenticar,
    exigirPapelParaEscrever('ORGANIZER'),
    criarMatchesRouter(matchesService),
  )
  // Estatísticas do jogador e rankings: derivados das súmulas, só leitura para qualquer logado.
  app.use('/api', criarStatsRouter(statsService, { autenticar }))
  // Sorteio de times: só o organizador (é ele quem monta a partida com o resultado).
  app.use('/api/sorteio', autenticar, exigirPapel('ORGANIZER'), criarDrawRouter(drawService))
  // Gestão de usuários: só organizador, inclusive para ler.
  app.use('/api/users', autenticar, exigirPapel('ORGANIZER'), criarUsersRouter(usersService))

  // Pedidos de organizador: o próprio router aplica as guardas (qualquer logado pede; só organizador decide).
  app.use(
    '/api/organizer-requests',
    criarOrganizerRequestsRouter(organizerRequestsService, {
      autenticar,
      exigirOrganizador: exigirPapel('ORGANIZER'),
    }),
  )

  app.use(notFound)
  app.use(errorHandler)
  return app
}
