// Acesso HTTP ao sorteio de times (o formato { data } / { erro } é tratado em api/http.js).
// A divisão é calculada no back-end; a tela só mostra o resultado.
import { comJson, pedir } from '../../../api/http.js'
import { apiDoGrupo } from '../../../api/grupoAtual.js'

export const MIN_JOGADORES = 6 // mesmos limites do back-end (draw.core.js), só para habilitar o botão
export const MAX_JOGADORES = 22

// { teams: [{ name: 'A', players: [{ id, nickname, position, strength }], strength }, ...], difference }
// (com 2 times também vêm teamA e teamB). teamCount: 2 (padrão) a 6.
export const sortearTimes = (playerIds, teamCount = 2) =>
  pedir(`${apiDoGrupo()}/sorteio`, comJson('POST', teamCount === 2 ? { playerIds } : { playerIds, teamCount }))

// Mínimo de jogadores para sortear N times (3 por time; com 2 times, 6).
export const minimoParaSortear = (teamCount) => Math.max(MIN_JOGADORES, 3 * teamCount)
export const maximoParaSortear = (teamCount) => (teamCount === 2 ? MAX_JOGADORES : 60)
