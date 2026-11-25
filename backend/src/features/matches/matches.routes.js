// Casca HTTP das partidas: requisição -> serviço -> resposta, sem regra aqui.
// Quem pode o quê é decidido no criarApp (qualquer participante lê; só organizador do grupo escreve).
// O grupo vem da participação de quem pede (req.participacao).
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
  const grupo = (req) => req.participacao.groupId

  router.get('/', async (req, res) => {
    res.json({ data: await service.listar(grupo(req)) })
  })

  // Antes de '/:id', senão "historico" seria lido como um id. Query: page, pageSize, playerId, de, ate.
  router.get('/historico', async (req, res) => {
    res.json({ data: await service.historico(grupo(req), req.query) })
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.buscar(grupo(req), lerId(req)) })
  })

  router.post('/', async (req, res) => {
    res.status(201).json({ data: await service.criar(grupo(req), req.body ?? {}) })
  })

  // Corpo: { "date": "2026-11-20T19:00", "location": "Quadra" } (só partida agendada)
  router.put('/:id', async (req, res) => {
    res.json({ data: await service.atualizar(grupo(req), lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/cancelar', async (req, res) => {
    res.json({ data: await service.cancelar(grupo(req), lerId(req)) })
  })

  // Corpo: { "teamA": [1, 2, 3], "teamB": [4, 5, 6] } (na pelada também teamC, teamD...)
  router.put('/:id/escalacao', async (req, res) => {
    res.json({ data: await service.definirEscalacao(grupo(req), lerId(req), req.body ?? {}) })
  })

  // Com a partida em andamento. Corpo: { "entraId": 7, "saiId": 3 } (troca), { "entraId": 7, "team": "B" }
  // (pôr num time) ou { "saiId": 3 } (tirar de campo)
  router.post('/:id/substituicao', async (req, res) => {
    res.json({ data: await service.substituir(grupo(req), lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/iniciar', async (req, res) => {
    res.json({ data: await service.iniciar(grupo(req), lerId(req)) })
  })

  router.patch('/:id/encerrar', async (req, res) => {
    res.json({ data: await service.encerrar(grupo(req), lerId(req)) })
  })

  // Corpo: { "scorerId": 1, "assistId": 2, "minute": 10, "ownGoal": false } (só scorerId é obrigatório)
  router.post('/:id/gols', async (req, res) => {
    res.status(201).json({ data: await service.registrarGol(grupo(req), lerId(req), req.body ?? {}) })
  })

  router.delete('/:id/gols/:goalId', async (req, res) => {
    res.json({ data: await service.removerGol(grupo(req), lerId(req), lerId(req, 'goalId')) })
  })

  // Cartões e defesas difíceis. Corpo: { "type": "YELLOW_CARD" | "RED_CARD" | "DIFFICULT_SAVE", "playerId": 1, "minute": 10 }
  router.post('/:id/lances', async (req, res) => {
    res.status(201).json({ data: await service.registrarEvento(grupo(req), lerId(req), req.body ?? {}) })
  })

  router.delete('/:id/lances/:eventId', async (req, res) => {
    res.json({ data: await service.removerEvento(grupo(req), lerId(req), lerId(req, 'eventId')) })
  })

  // Pelada: jogos da noite. Corpo: { "homeTeam": "A", "awayTeam": "C" }
  router.post('/:id/jogos', async (req, res) => {
    res.status(201).json({ data: await service.comecarJogo(grupo(req), lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/jogos/:gameId/encerrar', async (req, res) => {
    res.json({ data: await service.encerrarJogo(grupo(req), lerId(req), lerId(req, 'gameId')) })
  })

  return router
}
