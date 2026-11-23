// Acesso HTTP à API de jogadores (o formato { data } / { erro } é tratado em api/http.js).
import { comJson, pedir } from '../../api/http.js'

export function listarJogadores({ busca = '', apenasAtivos = false } = {}) {
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (apenasAtivos) params.set('ativos', 'true')
  const query = params.toString()
  return pedir(`/api/players${query ? `?${query}` : ''}`)
}

export function criarJogador(dados) {
  return pedir('/api/players', comJson('POST', dados))
}

export function atualizarJogador(id, dados) {
  return pedir(`/api/players/${id}`, comJson('PUT', dados))
}

export function inativarJogador(id) {
  return pedir(`/api/players/${id}/inativar`, { method: 'PATCH' })
}

export function excluirJogador(id) {
  return pedir(`/api/players/${id}`, { method: 'DELETE' })
}
