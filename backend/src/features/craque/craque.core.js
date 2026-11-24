// Núcleo puro da votação do craque: só regras, sem banco nem Express.
// Depois que a partida (ou a pelada) é encerrada, cada jogador que jogou dá um voto para o craque.
// Fica aberta por 48 horas; dá para trocar o voto até fechar.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export const PRAZO_EM_HORAS = 48

export const prazoDaVotacao = (partida) =>
  partida.finishedAt ? new Date(new Date(partida.finishedAt).getTime() + PRAZO_EM_HORAS * 3600_000) : null

export function votacaoAberta(partida, agora) {
  const prazo = prazoDaVotacao(partida)
  return partida.status === 'FINISHED' && prazo !== null && agora <= prazo
}

const jogou = (partida, playerId) => (partida.players ?? []).some((p) => p.playerId === playerId)

export function lerVoto(dados) {
  const playerId = dados?.playerId
  if (!Number.isInteger(playerId) || playerId <= 0) throw new ValidationError('Escolha o jogador (playerId)')
  return playerId
}

// Regras do voto:
//  1. só depois de encerrada e dentro do prazo;
//  2. só quem jogou vota (a conta precisa estar ligada a um jogador escalado);
//  3. só se vota em quem jogou, e nunca em si mesmo.
export function verificarPodeVotar({ partida, eleitorId, votadoId, agora }) {
  if (partida.status !== 'FINISHED') throw new BusinessRuleError('A votação do craque abre quando a partida é encerrada')
  if (!votacaoAberta(partida, agora)) throw new BusinessRuleError(`A votação do craque fecha ${PRAZO_EM_HORAS} horas depois da partida`)
  if (eleitorId === null || eleitorId === undefined || !jogou(partida, eleitorId)) {
    throw new BusinessRuleError('Só quem jogou a partida vota no craque')
  }
  if (!jogou(partida, votadoId)) throw new BusinessRuleError('Só dá para votar em quem jogou a partida')
  if (eleitorId === votadoId) throw new BusinessRuleError('Não vale votar em si mesmo')
}

// Apura os votos: cada candidato com quantos votos teve, do mais votado para o menos.
// Craques = os mais votados (empate = mais de um craque). Sem nenhum voto, ainda não há craque.
export function apurarVotos({ partida, votos }) {
  const candidatos = (partida.players ?? [])
    .map((p) => ({
      playerId: p.playerId,
      nickname: p.player?.nickname ?? null,
      team: p.team,
      votes: votos.filter((v) => v.votedId === p.playerId).length,
    }))
    .sort((a, b) => b.votes - a.votes || String(a.nickname).localeCompare(String(b.nickname), 'pt-BR'))
  const maximo = candidatos[0]?.votes ?? 0
  return { candidates: candidatos, craques: maximo > 0 ? candidatos.filter((c) => c.votes === maximo) : [] }
}
