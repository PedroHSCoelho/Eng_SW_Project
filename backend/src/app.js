import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { criarPlayersRouter } from './features/players/players.routes.js'
import { criarPlayersService } from './features/players/players.service.js'
import { playersRepository } from './features/players/players.repository.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
// As rotas de cada feature entram aqui. Aqui o serviço recebe o repositório real (Prisma).
app.use('/api/players', criarPlayersRouter(criarPlayersService(playersRepository)))

app.use(notFound)
app.use(errorHandler)

export default app
