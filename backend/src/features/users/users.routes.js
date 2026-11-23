// Casca HTTP da gestão de usuários. O app.js só monta este router atrás de
// "autenticar" + "exigir organizador", então aqui não há checagem de papel.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarUsersRouter(usersService) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json({ data: await usersService.listar() })
  })

  router.patch('/:id/role', async (req, res) => {
    res.json({ data: await usersService.alterarPapel(lerId(req), req.body?.role) })
  })

  // Corpo: { "playerId": 3 } para vincular, { "playerId": null } para desvincular.
  router.patch('/:id/player', async (req, res) => {
    const playerId = req.body?.playerId
    if (playerId === undefined) throw new ValidationError('Informe playerId (número ou null)')
    res.json({ data: await usersService.vincularJogador(lerId(req), playerId) })
  })

  return router
}
