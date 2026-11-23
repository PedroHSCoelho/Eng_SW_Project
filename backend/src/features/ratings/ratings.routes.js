// Casca HTTP das avaliações. Qualquer pessoa logada usa (a regra de quem pode avaliar é do núcleo).
// `autenticar` é aplicado rota a rota: este router é montado ANTES do de partidas
// (que só deixa o organizador escrever) e não pode transformar rota desconhecida em 401.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarRatingsRouter(service, { autenticar }) {
  const router = Router()

  // Corpo: { "ratedId": 2, "score": 4, "comment": "opcional" } -> cria ou edita a minha nota
  router.put('/matches/:id/avaliacoes', autenticar, async (req, res) => {
    res.json({ data: await service.avaliar(lerId(req), req.usuario, req.body ?? {}) })
  })

  router.get('/matches/:id/avaliacoes/pendentes', autenticar, async (req, res) => {
    res.json({ data: await service.pendentes(lerId(req), req.usuario) })
  })

  router.get('/matches/:id/avaliacoes/minhas', autenticar, async (req, res) => {
    res.json({ data: await service.minhas(lerId(req), req.usuario) })
  })

  router.get('/matches/:id/destaque', autenticar, async (req, res) => {
    res.json({ data: await service.destaque(lerId(req)) })
  })

  router.get('/players/:id/ratings', autenticar, async (req, res) => {
    res.json({ data: await service.notasDoJogador(lerId(req)) })
  })

  return router
}
