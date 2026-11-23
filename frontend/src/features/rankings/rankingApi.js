// Acesso HTTP ao ranking, às estatísticas e às notas (o formato { data } / { erro } é tratado em api/http.js).
// Nenhuma conta aqui: pontos, desempates e médias são calculados no back-end.
import { pedir } from '../../api/http.js'

// periodo: 'mes' | 'ano' | 'tudo'; posicao (opcional): 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
export function buscarRanking(periodo = 'tudo', posicao = '') {
  const posicaoNaUrl = posicao ? `&posicao=${encodeURIComponent(posicao)}` : ''
  return pedir(`/api/rankings?periodo=${encodeURIComponent(periodo)}${posicaoNaUrl}`)
}

export function buscarJogador(id) {
  return pedir(`/api/players/${id}`)
}

// periodo: 'mes' | 'ano' | 'tudo' (sem o parâmetro = tudo)
export function buscarEstatisticas(id, periodo = 'tudo') {
  return pedir(`/api/players/${id}/stats${periodo === 'tudo' ? '' : `?periodo=${encodeURIComponent(periodo)}`}`)
}

export function buscarNotas(id) {
  return pedir(`/api/players/${id}/ratings`)
}
