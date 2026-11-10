// Casca HTTP dos pedidos de organizador. Quem pede e quem decide vêm de req.usuario
// (cookie), nunca do corpo: ninguém pede nem decide "em nome de" outra pessoa.
import { Router } from 'express'
import { ValidationError } from '../../errors/AppError.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

export function criarOrganizerRequestsRouter(service, { autenticar, exigirOrganizador }) {
  const router = Router()

  // Qualquer logado pede (as regras de elegibilidade ficam no serviço).
  router.post('/', autenticar, async (req, res) => {
    res.status(201).json({ data: await service.solicitar(req.usuario, req.body ?? {}) })
  })

  // Último pedido de quem está logado (ou null), para a tela mostrar o estado.
  router.get('/mine', autenticar, async (req, res) => {
    res.json({ data: await service.meuPedido(req.usuario) })
  })

  // A fila de pedidos em análise: só organizador.
  router.get('/', autenticar, exigirOrganizador, async (req, res) => {
    res.json({ data: await service.listarPendentes() })
  })

  router.patch('/:id/approve', autenticar, exigirOrganizador, async (req, res) => {
    res.json({ data: await service.aprovar(lerId(req), req.usuario) })
  })

  router.patch('/:id/reject', autenticar, exigirOrganizador, async (req, res) => {
    res.json({ data: await service.recusar(lerId(req), req.usuario) })
  })

  return router
}
