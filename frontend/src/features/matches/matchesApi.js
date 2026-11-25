// Acesso HTTP à API de partidas (o formato { data } / { erro } é tratado em api/http.js).
// Toda ação devolve a partida inteira já com o placar (`score`) calculado pelo back-end.
import { comJson, pedir } from '../../api/http.js'
import { apiDoGrupo } from '../../api/grupoAtual.js'

export const listarPartidas = () => pedir(`${apiDoGrupo()}/matches`)

export const buscarPartida = (id) => pedir(`${apiDoGrupo()}/matches/${id}`)

// date: texto ISO (ex.: "2026-11-20T19:00:00.000Z")
export const criarPartida = (dados) => pedir(`${apiDoGrupo()}/matches`, comJson('POST', dados))

// Edita data e local (só partida agendada). dados: { date (ISO), location }
export const atualizarPartida = (id, dados) => pedir(`${apiDoGrupo()}/matches/${id}`, comJson('PUT', dados))

// Cancela uma partida agendada ou em andamento (não volta atrás).
export const cancelarPartida = (id) => pedir(`${apiDoGrupo()}/matches/${id}/cancelar`, { method: 'PATCH' })

// times: { teamA: [ids], teamB: [ids] } (na pelada também teamC, teamD...)
export const definirEscalacao = (id, times) => pedir(`${apiDoGrupo()}/matches/${id}/escalacao`, comJson('PUT', times))

// Durante a partida: { entraId, saiId } (troca), { entraId, team } (pôr num time) ou { saiId } (tirar de campo).
export const substituir = (id, corpo) => pedir(`${apiDoGrupo()}/matches/${id}/substituicao`, comJson('POST', corpo))

export const iniciarPartida = (id) => pedir(`${apiDoGrupo()}/matches/${id}/iniciar`, { method: 'PATCH' })

export const encerrarPartida = (id) => pedir(`${apiDoGrupo()}/matches/${id}/encerrar`, { method: 'PATCH' })

// gol: { scorerId, assistId?, minute?, ownGoal? }
export const lancarGol = (id, gol) => pedir(`${apiDoGrupo()}/matches/${id}/gols`, comJson('POST', gol))

export const removerGol = (id, goalId) => pedir(`${apiDoGrupo()}/matches/${id}/gols/${goalId}`, { method: 'DELETE' })

// Cartões e defesas difíceis. lance: { type: 'YELLOW_CARD' | 'RED_CARD' | 'DIFFICULT_SAVE', playerId, minute? }
export const lancarLance = (id, lance) => pedir(`${apiDoGrupo()}/matches/${id}/lances`, comJson('POST', lance))

export const removerLance = (id, eventId) =>
  pedir(`${apiDoGrupo()}/matches/${id}/lances/${eventId}`, { method: 'DELETE' })

// Lista de presença: { maxPlayers, confirmed: [...], waitlist: [...], openSpots, me }
export const buscarPresencas = (id) => pedir(`${apiDoGrupo()}/matches/${id}/presencas`)

// Sem playerId: confirma o MEU nome; com playerId: o organizador põe outro jogador.
// opcoes: { playerId } (admin põe outro jogador) e/ou { maybe: true } ("talvez": vai para a espera).
// Sem nada, confirma o meu nome. Quem já está na lista e manda o outro estado troca entre confirmado e talvez.
export const confirmarPresenca = (id, { playerId, maybe } = {}) =>
  pedir(
    `${apiDoGrupo()}/matches/${id}/presencas`,
    comJson('POST', { ...(playerId && { playerId }), ...(maybe !== undefined && { maybe }) }),
  )

// Convidados (gente de fora do grupo): devolvem a lista inteira, como as presenças.
export const levarConvidado = (id, name) => pedir(`${apiDoGrupo()}/matches/${id}/convidados`, comJson('POST', { name }))
export const tirarConvidado = (id, guestId) =>
  pedir(`${apiDoGrupo()}/matches/${id}/convidados/${guestId}`, { method: 'DELETE' })
// O convidado vira jogador do grupo (sem conta) e entra nos confirmados.
export const confirmarConvidado = (id, guestId, position) =>
  pedir(`${apiDoGrupo()}/matches/${id}/convidados/${guestId}/confirmar`, comJson('POST', { position }))

// Votação do craque: { open, deadline, canVote, myVote, totalVotes, totalVoters, candidates, craques }
export const buscarCraque = (id) => pedir(`${apiDoGrupo()}/matches/${id}/craque`)
export const votarNoCraque = (id, playerId) => pedir(`${apiDoGrupo()}/matches/${id}/craque`, comJson('POST', { playerId }))

export const sairDaLista = (id, playerId) =>
  pedir(`${apiDoGrupo()}/matches/${id}/presencas/${playerId}`, { method: 'DELETE' })

// Pelada: começa um jogo entre dois times da partida e encerra o jogo aberto.
export const comecarJogo = (id, { homeTeam, awayTeam }) =>
  pedir(`${apiDoGrupo()}/matches/${id}/jogos`, comJson('POST', { homeTeam, awayTeam }))

export const encerrarJogo = (id, gameId) =>
  pedir(`${apiDoGrupo()}/matches/${id}/jogos/${gameId}/encerrar`, { method: 'PATCH' })
