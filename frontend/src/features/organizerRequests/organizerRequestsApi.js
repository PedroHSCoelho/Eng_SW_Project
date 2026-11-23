import { comJson, pedir } from '../../api/http.js'

export const solicitarOrganizador = (message) =>
  pedir('/api/organizer-requests', comJson('POST', { message }))
export const buscarMeuPedido = () => pedir('/api/organizer-requests/mine')
// Só organizador:
export const listarPedidosPendentes = () => pedir('/api/organizer-requests')
export const aprovarPedido = (id) => pedir(`/api/organizer-requests/${id}/approve`, { method: 'PATCH' })
export const recusarPedido = (id) => pedir(`/api/organizer-requests/${id}/reject`, { method: 'PATCH' })
