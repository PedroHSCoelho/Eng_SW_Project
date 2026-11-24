// Casca HTTP da lista de presença. Qualquer participante do grupo usa (quem pode mexer em qual
// nome é decidido no núcleo). Montado dentro de /api/grupos/:grupoId ANTES do router de partidas,
// que só deixa o organizador escrever.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req, nome) {
  const id = Number(req.params[nome])
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarAttendanceRouter(service) {
  const router = Router()

  // { maxPlayers, confirmed: [...], waitlist: [...], openSpots, me: 'CONFIRMED' | 'WAITLIST' | null }
  router.get('/matches/:id/presencas', async (req, res) => {
    res.json({ data: await service.listar(req.participacao, lerId(req, 'id')) })
  })

  // Corpo: {} (confirmo eu) ou { "playerId": 3 } (organizador põe outro jogador)
  router.post('/matches/:id/presencas', async (req, res) => {
    res.status(201).json({ data: await service.confirmar(req.participacao, lerId(req, 'id'), req.body ?? {}) })
  })

  router.delete('/matches/:id/presencas/:playerId', async (req, res) => {
    res.json({ data: await service.sair(req.participacao, lerId(req, 'id'), lerId(req, 'playerId')) })
  })

  return router
}
