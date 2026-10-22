import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import playersRouter from './features/players/players.routes.js'
import matchesRouter from './features/matches/matches.routes.js'
import rankingsRouter from './features/rankings/rankings.routes.js'
import ratingsRouter from './features/ratings/ratings.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/players', playersRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/rankings', rankingsRouter)
app.use('/api/ratings', ratingsRouter)

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})

export default app
