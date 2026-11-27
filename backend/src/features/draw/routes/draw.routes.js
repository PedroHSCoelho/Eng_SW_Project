// Casca HTTP do sorteio. Não cria nada no banco (só calcula uma sugestão), então é um POST que responde 200.
import { Router } from 'express'

export function criarDrawRouter(service) {
  const router = Router()

  // Corpo: { "playerIds": [1, 2, 3, 4, 5, 6] } -> { teamA, teamB, difference }
  router.post('/', async (req, res) => {
    res.json({ data: await service.sortear(req.participacao.groupId, req.body ?? {}) })
  })

  return router
}
