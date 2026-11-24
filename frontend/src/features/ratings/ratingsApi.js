// Acesso HTTP às avaliações (o formato { data } / { erro } é tratado em api/http.js).
// Quem avalia vem da sessão (cookie), nunca do corpo: o front só informa avaliado, nota e comentário.
import { comJson, pedir } from '../../api/http.js'
import { apiDoGrupo } from '../../api/grupoAtual.js'

// { open, deadline, pending: [{ playerId, nickname }] }
export const buscarPendentes = (matchId) => pedir(`${apiDoGrupo()}/matches/${matchId}/avaliacoes/pendentes`)

// { playerId, nickname, average, count, goals } ou null
export const buscarDestaque = (matchId) => pedir(`${apiDoGrupo()}/matches/${matchId}/destaque`)

// nota: { ratedId, score, comment? }
export const avaliar = (matchId, nota) => pedir(`${apiDoGrupo()}/matches/${matchId}/avaliacoes`, comJson('PUT', nota))

// As notas que EU dei na partida: [{ ratedId, nickname, score, comment }] (nunca as de outras pessoas)
export const buscarMinhas = (matchId) => pedir(`${apiDoGrupo()}/matches/${matchId}/avaliacoes/minhas`)
