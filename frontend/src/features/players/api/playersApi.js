// Acesso HTTP à API de jogadores (o formato { data } / { erro } é tratado em api/http.js).
import { comJson, pedir } from '../../../api/http.js'
import { apiDoGrupo } from '../../../api/grupoAtual.js'

export function listarJogadores({ busca = '', apenasAtivos = false } = {}) {
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (apenasAtivos) params.set('ativos', 'true')
  const query = params.toString()
  return pedir(`${apiDoGrupo()}/players${query ? `?${query}` : ''}`)
}

export function criarJogador(dados) {
  return pedir(`${apiDoGrupo()}/players`, comJson('POST', dados))
}

export function atualizarJogador(id, dados) {
  return pedir(`${apiDoGrupo()}/players/${id}`, comJson('PUT', dados))
}

export function inativarJogador(id) {
  return pedir(`${apiDoGrupo()}/players/${id}/inativar`, { method: 'PATCH' })
}

export function excluirJogador(id) {
  return pedir(`${apiDoGrupo()}/players/${id}`, { method: 'DELETE' })
}

// Nota do admin (0 a 5, de 0,5 em 0,5; null apaga). Só admin consegue; a API devolve { id, nickname, skill }.
export const definirNota = (id, skill) => pedir(`${apiDoGrupo()}/players/${id}/nota`, comJson('PATCH', { skill }))
