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

export function criarApp({
  playersService,
  authService,
  usersService,
  organizerRequestsService,
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
