import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
// As rotas de cada feature entram aqui, por exemplo:
// app.use('/api/players', playersRouter)

app.use(notFound)
app.use(errorHandler)

export default app
