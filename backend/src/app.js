// Composição real: liga serviços aos repositórios do Prisma e às bibliotecas de verdade.
import { criarApp } from './criarApp.js'
import { criarPlayersService } from './features/players/players.service.js'
import { playersRepository } from './features/players/players.repository.js'
import { criarAuthService } from './features/auth/auth.service.js'
import { criarHasher } from './features/auth/hasher.js'
import { criarTokens } from './features/auth/tokens.js'
import { usersRepository } from './features/users/users.repository.js'
import { criarMatchesService } from './features/matches/matches.service.js'
import { matchesRepository } from './features/matches/matches.repository.js'
import { criarStatsService } from './features/stats/stats.service.js'
import { criarCraqueService } from './features/craque/craque.service.js'
import { craqueRepository } from './features/craque/craque.repository.js'
import { criarDrawService } from './features/draw/draw.service.js'
import { criarGroupsService } from './features/groups/groups.service.js'
import { groupsRepository } from './features/groups/groups.repository.js'
import { criarAttendanceService } from './features/attendance/attendance.service.js'
import { attendanceRepository } from './features/attendance/attendance.repository.js'

const tokens = criarTokens()

const authService = criarAuthService({
  usersRepo: usersRepository,
  hasher: criarHasher(),
  tokens,
})

const app = criarApp({
  playersService: criarPlayersService(playersRepository),
  authService,
  matchesService: criarMatchesService({ matchesRepo: matchesRepository, playersRepo: playersRepository }),
  statsService: criarStatsService({ matchesRepo: matchesRepository, playersRepo: playersRepository }),
  craqueService: criarCraqueService({ craqueRepo: craqueRepository, matchesRepo: matchesRepository }),
  drawService: criarDrawService({ playersRepo: playersRepository }),
  groupsService: criarGroupsService({ groupsRepo: groupsRepository, playersRepo: playersRepository }),
  attendanceService: criarAttendanceService({
    attendanceRepo: attendanceRepository,
    matchesRepo: matchesRepository,
    playersRepo: playersRepository,
  }),
  tokens,
  cookieSeguro: process.env.NODE_ENV === 'production',
})

export default app
