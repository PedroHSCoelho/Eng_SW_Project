// Casca HTTP das partidas: requisição -> serviço -> resposta, sem regra aqui.
// Quem pode o quê é decidido no criarApp (qualquer logado lê; só organizador escreve).
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

// Ids vêm da URL (texto): só aceita inteiro positivo.
function lerId(req, nome = 'id') {
  const id = Number(req.params[nome])
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

  // Antes de '/:id', senão "historico" seria lido como um id. Query: page, pageSize, playerId, de, ate.
  router.get('/historico', async (req, res) => {
    res.json({ data: await service.historico(req.query) })
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.buscar(lerId(req)) })
  })

  router.post('/', async (req, res) => {
    res.status(201).json({ data: await service.criar(req.body ?? {}) })
  })

  // Corpo: { "date": "2026-11-20T19:00", "location": "Quadra" } (só partida agendada)
  router.put('/:id', async (req, res) => {
    res.json({ data: await service.atualizar(lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/cancelar', async (req, res) => {
    res.json({ data: await service.cancelar(lerId(req)) })
  })

  // Corpo: { "teamA": [1, 2, 3], "teamB": [4, 5, 6] }
  router.put('/:id/escalacao', async (req, res) => {
    res.json({ data: await service.definirEscalacao(lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/iniciar', async (req, res) => {
    res.json({ data: await service.iniciar(lerId(req)) })
  })

  router.patch('/:id/encerrar', async (req, res) => {
    res.json({ data: await service.encerrar(lerId(req)) })
  })

  // Corpo: { "scorerId": 1, "assistId": 2, "minute": 10, "ownGoal": false } (só scorerId é obrigatório)
  router.post('/:id/gols', async (req, res) => {
    res.status(201).json({ data: await service.registrarGol(lerId(req), req.body ?? {}) })
  })

  router.delete('/:id/gols/:goalId', async (req, res) => {
    res.json({ data: await service.removerGol(lerId(req), lerId(req, 'goalId')) })
  })

  return router
}
