// Acesso HTTP ao ranking, às estatísticas e às notas (o formato { data } / { erro } é tratado em api/http.js).
// Nenhuma conta aqui: pontos, desempates e médias são calculados no back-end.
import { pedir } from '../../api/http.js'

// periodo: 'mes' | 'ano' | 'tudo'
export function buscarRanking(periodo = 'tudo') {
  return pedir(`/api/rankings?periodo=${encodeURIComponent(periodo)}`)
}

export function buscarJogador(id) {
  return pedir(`/api/players/${id}`)
}

export function buscarEstatisticas(id) {
  return pedir(`/api/players/${id}/stats`)
}

export function buscarNotas(id) {
  return pedir(`/api/players/${id}/ratings`)
}
