// Acesso HTTP ao histórico de partidas (o formato { data } / { erro } é tratado em api/http.js).
// Filtros e paginação são decididos no back-end; aqui só montamos a query.
import { pedir } from '../../../api/http.js'
import { apiDoGrupo } from '../../../api/grupoAtual.js'

// A API trata `ate` como EXCLUSIVO (dia seguinte ao último dia que a pessoa quer ver).
// Quem escolhe "até 30/11" espera ver o dia 30, então mandamos 01/12.
export function diaSeguinte(dataIso) {
  const data = new Date(`${dataIso}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + 1)
  return data.toISOString().slice(0, 10)
}

// filtros: { page, pageSize, playerId, de, ate } (todos opcionais; `ate` no sentido "inclusive")
export function buscarHistorico({ page = 1, pageSize = 10, playerId = '', de = '', ate = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (playerId) params.set('playerId', String(playerId))
  if (de) params.set('de', de)
  if (ate) params.set('ate', diaSeguinte(ate))
  return pedir(`${apiDoGrupo()}/matches/historico?${params}`)
}
