// Acesso HTTP aos grupos (o formato { data } / { erro } é tratado em api/http.js).
import { comJson, pedir } from '../../../api/http.js'

// [{ id, name, myRole, myPlayerId, inviteCode? }] (o código só vem para organizador)
export const listarMeusGrupos = () => pedir('/api/grupos')

// dados: { name, nickname?, position? } (apelido e posição só se quem cria também joga)
export const criarGrupo = (dados) => pedir('/api/grupos', comJson('POST', dados))

// { id, name, totalMembers, alreadyMember }
export const verConvite = (codigo) => pedir(`/api/convites/${encodeURIComponent(codigo)}`)

// dados: { nickname, position } -> cria o meu jogador no grupo
export const entrarNoGrupo = (codigo, dados) =>
  pedir(`/api/convites/${encodeURIComponent(codigo)}/entrar`, comJson('POST', dados))

export const renomearGrupo = (grupoId, name) => pedir(`/api/grupos/${grupoId}`, comJson('PATCH', { name }))

export const gerarNovoConvite = (grupoId) => pedir(`/api/grupos/${grupoId}/convite`, { method: 'POST' })

// [{ userId, role, playerId, user: { id, name }, player: { id, nickname } | null }]
export const listarMembros = (grupoId) => pedir(`/api/grupos/${grupoId}/membros`)

// mudancas: { role } e/ou { playerId } (null desvincula)
export const alterarMembro = (grupoId, userId, mudancas) =>
  pedir(`/api/grupos/${grupoId}/membros/${userId}`, comJson('PATCH', mudancas))

// Remover alguém (organizador) ou sair do grupo (o próprio userId)
export const removerMembro = (grupoId, userId) =>
  pedir(`/api/grupos/${grupoId}/membros/${userId}`, { method: 'DELETE' })
