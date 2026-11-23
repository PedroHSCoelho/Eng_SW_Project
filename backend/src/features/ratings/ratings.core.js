// Núcleo puro das avaliações: só regras, sem banco nem Express.
// O relógio (`agora`) entra por parâmetro para o teste controlar o prazo.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export const PRAZO_EM_HORAS = 48
export const MINIMO_DE_NOTAS = 3

const idValido = (id) => Number.isInteger(id) && id > 0
const arredondar1 = (n) => Math.round(n * 10) / 10

// Valida a entrada externa e devolve SÓ o que o cliente controla (lista explícita):
// quem avalia (raterId) nunca vem do corpo, e sim da conta logada.
export function validarAvaliacao(dados) {
  if (!idValido(dados.ratedId)) throw new ValidationError('Avaliado inválido (ratedId)')
  if (!Number.isInteger(dados.score) || dados.score < 1 || dados.score > 5) {
    throw new ValidationError('Nota deve ser um número inteiro de 1 a 5')
  }
  let comment = null
  if (dados.comment !== undefined && dados.comment !== null) {
    if (typeof dados.comment !== 'string' || dados.comment.trim().length > 200) {
      throw new ValidationError('Comentário deve ser um texto de até 200 caracteres')
    }
    comment = dados.comment.trim() || null
  }
  return { ratedId: dados.ratedId, score: dados.score, comment }
}

// Regras de quem pode avaliar quem. `avaliadorId` é o jogador ligado à conta logada (ou null).
export function verificarPodeAvaliar({ partida, avaliadorId, avaliadoId, agora }) {
  if (avaliadorId === null || avaliadorId === undefined) {
    throw new BusinessRuleError('Sua conta não está ligada a um jogador; peça ao organizador para ligá-la')
  }
  if (partida.status !== 'FINISHED') {
    throw new BusinessRuleError('Só é possível avaliar uma partida finalizada')
  }
  if (avaliadorId === avaliadoId) {
    throw new BusinessRuleError('Ninguém pode avaliar a si mesmo')
  }
  const jogou = (id) => partida.players.some((p) => p.playerId === id)
  if (!jogou(avaliadorId)) throw new BusinessRuleError('Só quem jogou a partida pode avaliar')
  if (!jogou(avaliadoId)) throw new BusinessRuleError('O avaliado não jogou esta partida')

  const limite = new Date(partida.finishedAt).getTime() + PRAZO_EM_HORAS * 3600_000
  if (agora.getTime() > limite) {
    throw new BusinessRuleError(`O prazo de ${PRAZO_EM_HORAS} horas para avaliar esta partida acabou`)
  }
}

// Quem o avaliador ainda não avaliou nesta partida (para a tela pós-partida).
// `avaliacoes` são as notas dadas por ele nesta partida.
export function avaliacoesPendentes({ partida, avaliadorId, avaliacoes }) {
  if (!partida.players.some((p) => p.playerId === avaliadorId)) return []
  const jaAvaliados = new Set(avaliacoes.filter((a) => a.raterId === avaliadorId).map((a) => a.ratedId))
  return partida.players
    .map((p) => p.playerId)
    .filter((id) => id !== avaliadorId && !jaAvaliados.has(id))
    .sort((a, b) => a - b)
}

// Média com 1 casa decimal. Com poucas notas não mostra nada: uma nota isolada
// revelaria quem a deu e não representa o jogador.
export function calcularMedia(notas, minimo = MINIMO_DE_NOTAS) {
  if (notas.length < minimo) return { average: null, count: notas.length }
  const soma = notas.reduce((total, nota) => total + nota, 0)
  return { average: arredondar1(soma / notas.length), count: notas.length }
}

// Resumo do perfil: média geral e média por partida (cada uma com o seu mínimo).
// `avaliacoes` = [{ matchId, score }] recebidas pelo jogador. Não traz quem avaliou.
export function resumoDeNotas(avaliacoes) {
  const porId = new Map()
  for (const { matchId, score } of avaliacoes) {
    porId.set(matchId, [...(porId.get(matchId) ?? []), score])
  }
  return {
    geral: calcularMedia(avaliacoes.map((a) => a.score)),
    porPartida: [...porId.entries()].map(([matchId, notas]) => ({ matchId, ...calcularMedia(notas) })),
  }
}

// Destaque da partida: maior média entre quem tem pelo menos 3 notas.
// Empate: mais gols (gol contra não conta); persistindo, menor id (resultado estável).
export function destaqueDaPartida({ avaliacoes, gols }) {
  const candidatos = new Map()
  for (const { ratedId, score } of avaliacoes) {
    candidatos.set(ratedId, [...(candidatos.get(ratedId) ?? []), score])
  }
  const golsDe = (id) => gols.filter((g) => g.scorerId === id && !g.ownGoal).length

  const ranking = [...candidatos.entries()]
    .map(([playerId, notas]) => ({ playerId, ...calcularMedia(notas), goals: golsDe(playerId) }))
    .filter((c) => c.average !== null)
    .sort((a, b) => b.average - a.average || b.goals - a.goals || a.playerId - b.playerId)

  return ranking[0] ?? null
}
