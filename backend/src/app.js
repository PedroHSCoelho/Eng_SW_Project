import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'

const app = express()

app.use(cors())
app.use(express.json())

// Cada feature ganha seu próprio arquivo em src/routes e é registrada aqui.
// Ex.: app.use('/api/campeonatos', campeonatosRouter)
app.use('/api/health', healthRouter)

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})

export default app
