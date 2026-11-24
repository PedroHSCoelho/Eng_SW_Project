// Casca HTTP dos grupos. Quem pede vem do login (req.usuario) e, dentro de um grupo,
// da participação (req.participacao, carregada pelo middleware). Nunca do corpo.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerUserId(req) {
  const id = Number(req.params.userId)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

// /api/grupos: criar e listar os meus (não depende de já participar de nenhum).
export function criarGroupsRouter(service) {
  const router = Router()

  // Corpo: { "name": "Pelada de quinta", "nickname": "Zé", "position": "FORWARD" }
  // (apelido e posição são opcionais: só se quem cria também joga)
  router.post('/', async (req, res) => {
    res.status(201).json({ data: await service.criar(req.usuario, req.body ?? {}) })
  })

  router.get('/', async (req, res) => {
    res.json({ data: await service.meus(req.usuario) })
  })

  return router
}

// /api/convites: ver o convite e entrar no grupo.
export function criarConvitesRouter(service) {
  const router = Router()

  router.get('/:codigo', async (req, res) => {
    res.json({ data: await service.verConvite(req.params.codigo, req.usuario) })
  })

  // Corpo: { "nickname": "Zé", "position": "FORWARD" } -> cria o jogador da pessoa no grupo
  router.post('/:codigo/entrar', async (req, res) => {
    res.status(201).json({ data: await service.entrar(req.params.codigo, req.usuario, req.body ?? {}) })
  })

  return router
}

// Rotas de dentro do grupo (montado em /api/grupos/:grupoId, depois do middleware de participação).
export function criarGroupRouter(service, { exigirOrganizadorDoGrupo }) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json({ data: await service.detalhes(req.participacao) })
  })

  router.patch('/', exigirOrganizadorDoGrupo, async (req, res) => {
    res.json({ data: await service.renomear(req.participacao, req.body ?? {}) })
  })

  router.post('/convite', exigirOrganizadorDoGrupo, async (req, res) => {
    res.json({ data: await service.novoConvite(req.participacao) })
  })

  router.get('/membros', async (req, res) => {
    res.json({ data: await service.membros(req.participacao) })
  })

  // Corpo: { "role": "ORGANIZER" } e/ou { "playerId": 3 } (null desvincula)
  router.patch('/membros/:userId', exigirOrganizadorDoGrupo, async (req, res) => {
    res.json({ data: await service.alterarMembro(req.participacao, lerUserId(req), req.body ?? {}) })
  })

  // Organizador remove alguém; qualquer um remove a si mesmo (sair do grupo). A regra fica no núcleo.
  router.delete('/membros/:userId', async (req, res) => {
    await service.removerMembro(req.participacao, lerUserId(req))
    res.status(204).end()
  })

  return router
}
