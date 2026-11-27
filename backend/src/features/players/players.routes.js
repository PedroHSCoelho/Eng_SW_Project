// Casca HTTP dos jogadores: traduz requisição -> serviço -> resposta.
// Sem regra de negócio aqui; erros lançados pelo serviço vão para o errorHandler
// (o Express 5 já encaminha erros de funções async).
// O grupo vem da participação de quem pede (req.participacao), carregada antes pelo middleware.
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

// Admin = papel ORGANIZER no grupo. Só ele vê a nota de cada jogador.
const ehAdmin = (req) => req.participacao?.role === 'ORGANIZER'

// Recebe o serviço pronto, assim os testes podem trocar o banco por um repositório falso.
export function criarPlayersRouter(service) {
  const router = Router()

  router.get('/', async (req, res) => {
    const data = await service.listar(req.participacao.groupId, {
      busca: req.query.busca,
      apenasAtivos: req.query.ativos === 'true',
      comNota: ehAdmin(req),
    })
    res.json({ data })
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await service.buscar(req.participacao.groupId, lerId(req), { comNota: ehAdmin(req) }) })
  })

  // Nota do admin (0 a 5, de 0,5 em 0,5) que equilibra o sorteio. Corpo: { "skill": 3.5 } ou { "skill": null }.
  // Só admin chega aqui: o router é montado com "escrita só para admin".
  router.patch('/:id/nota', async (req, res) => {
    res.json({ data: await service.definirNota(req.participacao.groupId, lerId(req), req.body ?? {}) })
  })

  router.post('/', async (req, res) => {
    const data = await service.criar(req.participacao.groupId, req.body ?? {})
    res.status(201).json({ data })
  })

  router.put('/:id', async (req, res) => {
    res.json({ data: await service.atualizar(req.participacao.groupId, lerId(req), req.body ?? {}) })
  })

  router.patch('/:id/inativar', async (req, res) => {
    res.json({ data: await service.inativar(req.participacao.groupId, lerId(req)) })
  })

  router.patch('/:id/reativar', async (req, res) => {
    res.json({ data: await service.reativar(req.participacao.groupId, lerId(req)) })
  })

  router.delete('/:id', async (req, res) => {
    await service.excluir(req.participacao.groupId, lerId(req))
    res.status(204).end()
  })

  return router
}
