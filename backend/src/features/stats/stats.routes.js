// Casca HTTP das estatísticas e do ranking (só leitura: qualquer pessoa logada vê).
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

// `autenticar` é aplicado rota a rota (e não no mount em /api) para rota desconhecida continuar 404.
export function criarStatsRouter(service, { autenticar }) {
  const router = Router()

  router.get('/players/:id/stats', autenticar, async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
    res.json({ data: await service.estatisticasDoJogador(id, { de: req.query.de, ate: req.query.ate, periodo: req.query.periodo }) })
  })

  router.get('/rankings', autenticar, async (req, res) => {
    const periodo = typeof req.query.periodo === 'string' ? req.query.periodo : undefined
    res.json({ data: await service.ranking({ periodo, posicao: req.query.posicao }) })
  })

  return router
}
