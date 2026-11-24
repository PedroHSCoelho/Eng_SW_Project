// Núcleo puro da lista de presença ("lista do fut"): só regras, sem banco nem Express.
// Quem é confirmado e quem está na espera NÃO é gravado: sai da ordem de chegada e das vagas.
// Assim, quando alguém sai da lista, o primeiro da espera sobe sozinho.
import { BusinessRuleError, ForbiddenError } from '../../errors/AppError.js'

// Ordem de chegada; empate (mesmo instante) desempata pelo id do jogador, para ser estável.
const porChegada = (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.playerId - b.playerId

// `presencas`: [{ playerId, createdAt, player: { nickname, position } }]
// `maxPlayers`: vagas (null = sem limite). `meuJogadorId`: jogador de quem pede (ou null).
export function montarLista({ presencas, maxPlayers, meuJogadorId = null }) {
  const linhas = [...presencas].sort(porChegada).map((p, i) => ({
    playerId: p.playerId,
    nickname: p.player?.nickname ?? null,
    position: p.player?.position ?? null,
    createdAt: p.createdAt,
    order: i + 1, // posição na ordem de chegada (1 = primeiro a confirmar)
  }))
  const vagas = maxPlayers ?? linhas.length
  const confirmed = linhas.slice(0, vagas)
  const waitlist = linhas.slice(vagas)
  const me = confirmed.some((l) => l.playerId === meuJogadorId)
    ? 'CONFIRMED'
    : waitlist.some((l) => l.playerId === meuJogadorId)
      ? 'WAITLIST'
      : null
  return {
    maxPlayers: maxPlayers ?? null,
    confirmed,
    waitlist,
    openSpots: maxPlayers === null || maxPlayers === undefined ? null : Math.max(0, maxPlayers - confirmed.length),
    me,
  }
}

// A lista só muda enquanto a partida está agendada (depois que começa, quem jogou é a escalação).
export function verificarListaAberta(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('A lista de presença só muda enquanto a partida está agendada')
  }
}

// De quem é o nome que entra: o informado no corpo ou, sem nada, o jogador de quem pede.
export function jogadorDaPresenca(participacao, corpo) {
  const informado = corpo.playerId ?? null
  if (informado !== null) return informado
  if (participacao.playerId === null || participacao.playerId === undefined) {
    throw new BusinessRuleError('Sua conta não está ligada a um jogador deste grupo; peça ao organizador')
  }
  return participacao.playerId
}

// Membro só põe ou tira o PRÓPRIO nome; o organizador mexe em qualquer um
// (ex.: o amigo que não tem conta e mandou mensagem pedindo para entrar na lista).
export function verificarPodeMexer({ participacao, playerId }) {
  if (participacao.role === 'ORGANIZER') return
  if (participacao.playerId !== playerId) {
    throw new ForbiddenError('Você só pode confirmar ou tirar o seu próprio nome da lista')
  }
}
