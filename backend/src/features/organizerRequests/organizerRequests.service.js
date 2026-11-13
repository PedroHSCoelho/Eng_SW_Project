// Orquestra os pedidos de organizador: lê dados, chama o núcleo (regras) e grava.
import { NotFoundError } from '../../errors/AppError.js'
import { validarMotivo, verificarDecisao, verificarElegibilidade } from './organizerRequests.core.js'

// Só estes campos de quem pediu saem pela API (lista explícita: um campo novo na tabela
// de usuários, como o hash da senha, nunca vaza por aqui sem alguém decidir isso).
function pedidoPublico(pedido) {
  if (!pedido?.user) return pedido
  const { id, name, email, player } = pedido.user
  return { ...pedido, user: { id, name, email, player: player ?? null } }
}

export function criarOrganizerRequestsService({ requestsRepo, agora = () => new Date() }) {
  async function buscarPendenteOuFalhar(id, organizador) {
    const pedido = await requestsRepo.buscarPorId(id)
    if (!pedido) throw new NotFoundError('Pedido não encontrado')
    verificarDecisao({ pedido, decisorId: organizador.id })
    return pedido
  }

  return {
    // "usuario" é quem está logado (vem do cookie, nunca do corpo da requisição).
    async solicitar(usuario, dados) {
      const message = validarMotivo(dados.message)
      const ultimoPedido = await requestsRepo.buscarUltimoDoUsuario(usuario.id)
      verificarElegibilidade({ usuario, ultimoPedido, agora: agora() })
      return pedidoPublico(await requestsRepo.criar({ userId: usuario.id, message }))
    },

    async meuPedido(usuario) {
      return (await requestsRepo.buscarUltimoDoUsuario(usuario.id)) ?? null
    },

    async listarPendentes() {
      return (await requestsRepo.listar({ status: 'PENDING' })).map(pedidoPublico)
    },

    // Aprovar muda o papel de quem pediu E fecha o pedido, numa transação (no repositório).
    async aprovar(id, organizador) {
      const pedido = await buscarPendenteOuFalhar(id, organizador)
      return pedidoPublico(
        await requestsRepo.aprovar({ id, userId: pedido.userId, decidedById: organizador.id }),
      )
    },

    async recusar(id, organizador) {
      await buscarPendenteOuFalhar(id, organizador)
      return pedidoPublico(await requestsRepo.recusar({ id, decidedById: organizador.id }))
    },
  }
}
