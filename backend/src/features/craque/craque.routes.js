// Casca HTTP da votação do craque. Qualquer participante do grupo vê o resultado; quem jogou vota.
// Montado dentro de /api/grupos/:grupoId ANTES do router de partidas, que só deixa admin escrever.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarCraqueRouter(service) {
  const router = Router()

  // { open, deadline, canVote, myVote, totalVotes, totalVoters, candidates: [...], craques: [...] }
  router.get('/matches/:id/craque', async (req, res) => {
    res.json({ data: await service.ver(req.participacao, lerId(req)) })
  })

  // Corpo: { "playerId": 5 }. Votar de novo troca o voto.
  router.post('/matches/:id/craque', async (req, res) => {
    res.json({ data: await service.votar(req.participacao, lerId(req), req.body ?? {}) })
  })

  return router
}
