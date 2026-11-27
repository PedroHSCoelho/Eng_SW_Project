// Acesso HTTP ao sorteio de times (o formato { data } / { erro } é tratado em api/http.js).
// A divisão é calculada no back-end; a tela só mostra o resultado.
import { comJson, pedir } from '../../api/http.js'
import { apiDoGrupo } from '../../api/grupoAtual.js'

// Mesmos limites do back-end (draw.core.js), só para habilitar o botão: de 3 a 11 por time.
export const MIN_POR_TIME = 3
export const MAX_POR_TIME = 11
export const MIN_JOGADORES = 2 * MIN_POR_TIME
export const MAX_JOGADORES = 2 * MAX_POR_TIME

// { teams: [{ name: 'A', players: [{ id, nickname, position, strength }], strength }, ...], difference }
// (com 2 times também vêm teamA e teamB). teamCount: 2 (padrão) a 6.
export const sortearTimes = (playerIds, teamCount = 2) =>
  pedir(`${apiDoGrupo()}/sorteio`, comJson('POST', teamCount === 2 ? { playerIds } : { playerIds, teamCount }))

// Limites para sortear N times: 3 a 11 por time (2 times: 6 a 22; 3 times: 9 a 33).
export const minimoParaSortear = (teamCount) => MIN_POR_TIME * teamCount
export const maximoParaSortear = (teamCount) => MAX_POR_TIME * teamCount
