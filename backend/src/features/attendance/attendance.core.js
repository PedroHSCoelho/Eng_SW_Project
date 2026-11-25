// Núcleo puro da lista de presença ("lista do fut"): só regras, sem banco nem Express.
// Quem é confirmado e quem está na espera NÃO é gravado: sai da ordem de chegada e das vagas.
// Assim, quando alguém sai da lista, o primeiro da espera sobe sozinho.
// "Talvez" (maybe): a pessoa entra direto na espera, mesmo com vaga, e não sobe sozinha
// (ela mesma confirma quando souber que vai).
// Convidados (gente de fora do grupo) só ocupam as vagas que sobram depois dos jogadores do grupo.
import { BusinessRuleError, ForbiddenError, ValidationError } from '../../errors/AppError.js'

// Ordem de chegada; empate (mesmo instante) desempata pelo id do jogador, para ser estável.
const porChegada = (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.playerId - b.playerId

const convidadosPorChegada = (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id

// `presencas`: [{ playerId, maybe, createdAt, player: { nickname, position } }]
// `convidados`: [{ id, name, createdAt, invitedById, invitedBy: { id, nickname } | null }]
// `maxPlayers`: vagas (null = sem limite). `meuJogadorId`: jogador de quem pede (ou null).
// Espera = quem passou das vagas (sobe sozinho, na ordem de chegada) e depois quem marcou "talvez".
export function montarLista({ presencas, convidados = [], maxPlayers, meuJogadorId = null }) {
  const linhas = [...presencas].sort(porChegada).map((p, i) => ({
    playerId: p.playerId,
    nickname: p.player?.nickname ?? null,
    position: p.player?.position ?? null,
    maybe: p.maybe === true,
    createdAt: p.createdAt,
    order: i + 1, // posição na ordem de chegada (1 = primeiro a entrar na lista)
  }))
  const firmes = linhas.filter((l) => !l.maybe)
  const talvez = linhas.filter((l) => l.maybe)
  const semLimite = maxPlayers === null || maxPlayers === undefined
  const vagas = semLimite ? firmes.length : maxPlayers
  const confirmed = firmes.slice(0, vagas)
  const waitlist = [...firmes.slice(vagas), ...talvez]

  // Convidados: entram nas vagas que sobraram (sem limite, todos entram).
  const sobra = semLimite ? Infinity : Math.max(0, maxPlayers - confirmed.length)
  const guests = [...convidados].sort(convidadosPorChegada).map((c, i) => ({
    id: c.id,
    name: c.name,
    invitedBy: c.invitedBy ? { playerId: c.invitedBy.id, nickname: c.invitedBy.nickname } : null,
    status: i < sobra ? 'CONFIRMED' : 'WAITLIST',
  }))
  const convidadosDentro = guests.filter((g) => g.status === 'CONFIRMED').length

  const minha = linhas.find((l) => l.playerId === meuJogadorId)
  const me = !minha ? null : minha.maybe ? 'MAYBE' : confirmed.includes(minha) ? 'CONFIRMED' : 'WAITLIST'
  return {
    maxPlayers: semLimite ? null : maxPlayers,
    confirmed,
    waitlist,
    guests,
    openSpots: semLimite ? null : Math.max(0, maxPlayers - confirmed.length - convidadosDentro),
    me,
  }
}

export const NOME_DO_CONVIDADO_MAXIMO = 40

// Nome do convidado: de 2 a 40 caracteres, sem espaços nas pontas.
export function lerConvidado(dados) {
  const name = typeof dados?.name === 'string' ? dados.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2 || name.length > NOME_DO_CONVIDADO_MAXIMO) {
    throw new ValidationError(`O nome do convidado deve ter de 2 a ${NOME_DO_CONVIDADO_MAXIMO} caracteres`)
  }
  return name
}

// `maybe` no corpo: ausente = confirmar; true = "talvez" (vai para a espera).
export function lerTalvez(corpo) {
  const maybe = corpo?.maybe ?? false
  if (typeof maybe !== 'boolean') throw new ValidationError('maybe deve ser true ou false')
  return maybe
}

// Quem leva convidado: o jogador de quem pede. Admin sem jogador também pode pôr (fica sem "de quem").
export function quemConvida(participacao) {
  if (participacao.playerId !== null && participacao.playerId !== undefined) return participacao.playerId
  if (participacao.role === 'ORGANIZER') return null
  throw new BusinessRuleError('Sua conta não está ligada a um jogador deste grupo; peça a um admin')
}

// Tira convidado: quem levou ou um admin.
export function verificarPodeTirarConvidado({ participacao, convidado }) {
  if (participacao.role === 'ORGANIZER') return
  if (convidado.invitedById === null || convidado.invitedById !== participacao.playerId) {
    throw new ForbiddenError('Só quem levou o convidado (ou um admin) pode tirá-lo da lista')
  }
}

// Convidado que vira jogador do grupo precisa de uma posição (o cadastro de jogador exige).
export const POSICOES = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']

export function lerPosicaoDoConvidado(corpo) {
  const position = corpo?.position
  if (!POSICOES.includes(position)) {
    throw new ValidationError(`Posição inválida (use ${POSICOES.join(', ')})`)
  }
  return position
}

// Nome do convidado vira o nome e o apelido do novo jogador (cortados no tamanho do cadastro).
export function jogadorDoConvidado(convidado, position) {
  const nickname = convidado.name.trim().slice(0, 30).trim()
  return { name: convidado.name.trim().slice(0, 50), nickname, nicknameKey: nickname.toLowerCase(), position }
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
    throw new BusinessRuleError('Sua conta não está ligada a um jogador deste grupo; peça a um admin')
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
