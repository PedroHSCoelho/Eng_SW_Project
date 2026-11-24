// Casca HTTP das estatísticas e do ranking (só leitura: qualquer participante do grupo vê).
// Montado dentro de /api/grupos/:grupoId, que já exige login e participação.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

export function criarStatsRouter(service) {
  const router = Router()

  router.get('/players/:id/stats', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
    res.json({ data: await service.estatisticasDoJogador(req.participacao.groupId, id, { de: req.query.de, ate: req.query.ate, periodo: req.query.periodo }) })
  })

  router.get('/rankings', async (req, res) => {
    const periodo = typeof req.query.periodo === 'string' ? req.query.periodo : undefined
    res.json({ data: await service.ranking(req.participacao.groupId, { periodo, posicao: req.query.posicao }) })
  })

  return router
}
