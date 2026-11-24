// Casos de uso da votação do craque: lê a partida (pelo repositório de partidas) e os votos,
// pede a decisão ao núcleo (craque.core.js) e grava. Quem vota é SEMPRE o jogador da conta
// logada neste grupo (`participacao.playerId`), nunca o corpo da requisição.
import { NotFoundError } from '../../errors/AppError.js'
import { apurarVotos, lerVoto, prazoDaVotacao, verificarPodeVotar, votacaoAberta } from './craque.core.js'

export function criarCraqueService({ craqueRepo, matchesRepo, agora = () => new Date() }) {
  async function partidaOuFalhar(groupId, id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida || partida.groupId !== groupId) throw new NotFoundError('Partida não encontrada')
    return partida
  }

  async function situacao(participacao, partida) {
    const votos = partida.status === 'FINISHED' ? await craqueRepo.listarDaPartida(partida.id) : []
    const eu = participacao.playerId ?? null
    const aberta = votacaoAberta(partida, agora())
    const jogou = eu !== null && (partida.players ?? []).some((p) => p.playerId === eu)
    return {
      open: aberta,
      deadline: prazoDaVotacao(partida),
      canVote: aberta && jogou,
      myVote: votos.find((v) => v.voterId === eu)?.votedId ?? null,
      totalVotes: votos.length,
      totalVoters: (partida.players ?? []).length,
      ...apurarVotos({ partida, votos }),
    }
  }

  return {
    async ver(participacao, matchId) {
      return situacao(participacao, await partidaOuFalhar(participacao.groupId, matchId))
    },

    async votar(participacao, matchId, dados) {
      const partida = await partidaOuFalhar(participacao.groupId, matchId)
      const votadoId = lerVoto(dados)
      const eleitorId = participacao.playerId ?? null
      verificarPodeVotar({ partida, eleitorId, votadoId, agora: agora() })
      await craqueRepo.votar({ matchId, voterId: eleitorId, votedId: votadoId })
      return situacao(participacao, partida)
    },
  }
}
