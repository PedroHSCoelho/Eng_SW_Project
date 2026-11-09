// Casca HTTP dos jogadores: traduz requisição -> serviço -> resposta.
// Sem regra de negócio aqui; erros lançados pelo serviço vão para o errorHandler
// (o Express 5 já encaminha erros de funções async).
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

// O id vem da URL (texto): só aceita inteiro positivo.
function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Id inválido')
  }
  return id
}

// Recebe o serviço pronto, assim os testes podem trocar o banco por um repositório falso.
export function criarPlayersRouter(service) {
  const router = Router()

  router.get('/', async (req, res) => {
    const data = await service.listar({
      busca: req.query.busca,
      apenasAtivos: req.query.ativos === 'true',
    })
    res.json({ data })
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.buscar(lerId(req)) })
  })

  router.post('/', async (req, res) => {
    const data = await service.criar(req.body ?? {})
    res.status(201).json({ data })
  })

  router.put('/:id', async (req, res) => {
    res.json({ data: await service.atualizar(lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/inativar', async (req, res) => {
    res.json({ data: await service.inativar(lerId(req)) })
  })

  router.delete('/:id', async (req, res) => {
    await service.excluir(lerId(req))
    res.status(204).end()
  })

  return router
}
