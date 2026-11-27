// Composição real: liga serviços aos repositórios do Prisma e às bibliotecas de verdade.
import { criarApp } from './criarApp.js'
import { criarPlayersService } from './features/players/service/players.service.js'
import { playersRepository } from './features/players/repository/players.repository.js'
import { criarAuthService } from './features/auth/service/auth.service.js'
import { criarHasher } from './features/auth/utils/hasher.js'
import { criarTokens } from './features/auth/utils/tokens.js'
import { usersRepository } from './features/users/repository/users.repository.js'
import { criarMatchesService } from './features/matches/service/matches.service.js'
import { matchesRepository } from './features/matches/repository/matches.repository.js'
import { criarStatsService } from './features/stats/service/stats.service.js'
import { criarCraqueService } from './features/craque/service/craque.service.js'
import { craqueRepository } from './features/craque/repository/craque.repository.js'
import { criarDrawService } from './features/draw/service/draw.service.js'
import { criarGroupsService } from './features/groups/service/groups.service.js'
import { groupsRepository } from './features/groups/repository/groups.repository.js'
import { criarAttendanceService } from './features/attendance/service/attendance.service.js'
import { attendanceRepository } from './features/attendance/repository/attendance.repository.js'
import { criarPhotosService } from './features/photos/service/photos.service.js'
import { photosRepository } from './features/photos/repository/photos.repository.js'

const tokens = criarTokens()

const authService = criarAuthService({
  usersRepo: usersRepository,
  hasher: criarHasher(),
  tokens,
})

const app = criarApp({
  playersService: criarPlayersService(playersRepository),
  authService,
  matchesService: criarMatchesService({
    matchesRepo: matchesRepository,
    playersRepo: playersRepository,
    attendanceRepo: attendanceRepository,
  }),
  statsService: criarStatsService({ matchesRepo: matchesRepository, playersRepo: playersRepository }),
  craqueService: criarCraqueService({ craqueRepo: craqueRepository, matchesRepo: matchesRepository }),
  drawService: criarDrawService({ playersRepo: playersRepository }),
  groupsService: criarGroupsService({ groupsRepo: groupsRepository, playersRepo: playersRepository }),
  attendanceService: criarAttendanceService({
    attendanceRepo: attendanceRepository,
    matchesRepo: matchesRepository,
    playersRepo: playersRepository,
  }),
  photosService: criarPhotosService({ photosRepo: photosRepository, playersRepo: playersRepository }),
  tokens,
  cookieSeguro: process.env.NODE_ENV === 'production',
})

export default app
