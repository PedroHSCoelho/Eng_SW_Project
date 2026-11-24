// Casca HTTP das avaliações. Qualquer participante do grupo usa (a regra de quem pode avaliar é do núcleo).
// Montado dentro de /api/grupos/:grupoId ANTES do router de partidas (que só deixa o organizador escrever).
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarRatingsRouter(service) {
  const router = Router()

  // Corpo: { "ratedId": 2, "score": 4, "comment": "opcional" } -> cria ou edita a minha nota
  router.put('/matches/:id/avaliacoes', async (req, res) => {
    res.json({ data: await service.avaliar(req.participacao, lerId(req), req.body ?? {}) })
  })

  router.get('/matches/:id/avaliacoes/pendentes', async (req, res) => {
    res.json({ data: await service.pendentes(req.participacao, lerId(req)) })
  })

  router.get('/matches/:id/avaliacoes/minhas', async (req, res) => {
    res.json({ data: await service.minhas(req.participacao, lerId(req)) })
  })

  router.get('/matches/:id/destaque', async (req, res) => {
    res.json({ data: await service.destaque(req.participacao.groupId, lerId(req)) })
  })

  router.get('/players/:id/ratings', async (req, res) => {
    res.json({ data: await service.notasDoJogador(req.participacao.groupId, lerId(req)) })
  })

  return router
}
