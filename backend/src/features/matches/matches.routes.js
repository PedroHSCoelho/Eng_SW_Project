// Casca HTTP das partidas: requisição -> serviço -> resposta, sem regra aqui.
// Quem pode o quê é decidido no criarApp (qualquer logado lê; só organizador escreve).
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Id inválido')
  }
  return id
}

export function criarMatchesRouter(service) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json({ data: await service.listar() })
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.buscar(lerId(req)) })
  })

  router.post('/', async (req, res) => {
    res.status(201).json({ data: await service.criar(req.body ?? {}) })
  })

  // Corpo: { "teamA": [1, 2, 3], "teamB": [4, 5, 6] }
  router.put('/:id/escalacao', async (req, res) => {
    res.json({ data: await service.definirEscalacao(lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/iniciar', async (req, res) => {
    res.json({ data: await service.iniciar(lerId(req)) })
  })

  return router
}
