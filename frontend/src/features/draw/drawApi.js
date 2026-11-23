// Acesso HTTP ao sorteio de times (o formato { data } / { erro } é tratado em api/http.js).
// A divisão é calculada no back-end; a tela só mostra o resultado.
import { comJson, pedir } from '../../api/http.js'

export const MIN_JOGADORES = 6 // mesmos limites do back-end (draw.core.js), só para habilitar o botão
export const MAX_JOGADORES = 22

// { teamA: { players: [{ id, nickname, position, strength }], strength }, teamB: {...}, difference }
export const sortearTimes = (playerIds) => pedir('/api/sorteio', comJson('POST', { playerIds }))
