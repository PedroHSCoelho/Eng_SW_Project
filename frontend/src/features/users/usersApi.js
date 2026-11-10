import { comJson, pedir } from '../../api/http.js'

export const listarUsuarios = () => pedir('/api/users')
export const alterarPapel = (id, role) => pedir(`/api/users/${id}/role`, comJson('PATCH', { role }))
// playerId = null desfaz o vínculo
export const vincularJogador = (id, playerId) =>
  pedir(`/api/users/${id}/player`, comJson('PATCH', { playerId }))
