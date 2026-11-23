// Acesso HTTP à API de partidas (o formato { data } / { erro } é tratado em api/http.js).
// Toda ação devolve a partida inteira já com o placar (`score`) calculado pelo back-end.
import { comJson, pedir } from '../../api/http.js'

export const listarPartidas = () => pedir('/api/matches')

export const buscarPartida = (id) => pedir(`/api/matches/${id}`)

// date: texto ISO (ex.: "2026-11-20T19:00:00.000Z")
export const criarPartida = (dados) => pedir('/api/matches', comJson('POST', dados))

export const definirEscalacao = (id, { teamA, teamB }) =>
  pedir(`/api/matches/${id}/escalacao`, comJson('PUT', { teamA, teamB }))

export const iniciarPartida = (id) => pedir(`/api/matches/${id}/iniciar`, { method: 'PATCH' })

export const encerrarPartida = (id) => pedir(`/api/matches/${id}/encerrar`, { method: 'PATCH' })

// gol: { scorerId, assistId?, minute?, ownGoal? }
export const lancarGol = (id, gol) => pedir(`/api/matches/${id}/gols`, comJson('POST', gol))

export const removerGol = (id, goalId) => pedir(`/api/matches/${id}/gols/${goalId}`, { method: 'DELETE' })
