// Composição real: liga serviços aos repositórios do Prisma e às bibliotecas de verdade.
import { criarApp } from './criarApp.js'
import { criarPlayersService } from './features/players/players.service.js'
import { playersRepository } from './features/players/players.repository.js'
import { criarAuthService } from './features/auth/auth.service.js'
import { criarHasher } from './features/auth/hasher.js'
import { criarTokens } from './features/auth/tokens.js'
import { criarUsersService } from './features/users/users.service.js'
import { usersRepository } from './features/users/users.repository.js'
import { criarOrganizerRequestsService } from './features/organizerRequests/organizerRequests.service.js'
import { organizerRequestsRepository } from './features/organizerRequests/organizerRequests.repository.js'
import { criarMatchesService } from './features/matches/matches.service.js'
import { matchesRepository } from './features/matches/matches.repository.js'
import { criarStatsService } from './features/stats/stats.service.js'
import { criarRatingsService } from './features/ratings/ratings.service.js'
import { ratingsRepository } from './features/ratings/ratings.repository.js'
import { criarDrawService } from './features/draw/draw.service.js'

const tokens = criarTokens()

const authService = criarAuthService({
  usersRepo: usersRepository,
  hasher: criarHasher(),
  tokens,
})

const app = criarApp({
  playersService: criarPlayersService(playersRepository),
  authService,
  usersService: criarUsersService({ usersRepo: usersRepository, playersRepo: playersRepository }),
  organizerRequestsService: criarOrganizerRequestsService({
    requestsRepo: organizerRequestsRepository,
  }),
  matchesService: criarMatchesService({ matchesRepo: matchesRepository, playersRepo: playersRepository }),
  statsService: criarStatsService({ matchesRepo: matchesRepository, playersRepo: playersRepository }),
  ratingsService: criarRatingsService({
    ratingsRepo: ratingsRepository,
    matchesRepo: matchesRepository,
    playersRepo: playersRepository,
  }),
  drawService: criarDrawService({ playersRepo: playersRepository, ratingsRepo: ratingsRepository }),
  tokens,
  cookieSeguro: process.env.NODE_ENV === 'production',
})

export default app
