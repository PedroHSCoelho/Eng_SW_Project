// Casos de uso das avaliações: lê o que precisa, pede a decisão ao núcleo
// (ratings.core.js) e grava. Partidas e jogadores vêm pelos repositórios dos
// respectivos módulos (nunca direto na tabela).
// Quem avalia é o jogador da pessoa NESTE grupo (`participacao.playerId`); partida ou jogador
// de outro grupo é tratado como inexistente.
import { NotFoundError } from '../../errors/AppError.js'
import {
  PRAZO_EM_HORAS,
  avaliacoesPendentes,
  destaqueDaPartida,
  resumoDeNotas,
  validarAvaliacao,
  verificarPodeAvaliar,
} from './ratings.core.js'

const prazoDe = (partida) =>
  partida.finishedAt ? new Date(new Date(partida.finishedAt).getTime() + PRAZO_EM_HORAS * 3600_000) : null

export function criarRatingsService({ ratingsRepo, matchesRepo, playersRepo, agora = () => new Date() }) {
  async function partidaOuFalhar(groupId, id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida || partida.groupId !== groupId) throw new NotFoundError('Partida não encontrada')
    return partida
  }
  const apelidoDe = (partida, playerId) =>
    partida.players.find((p) => p.playerId === playerId)?.player?.nickname ?? null

  return {
    // O avaliador é SEMPRE o jogador da conta logada neste grupo (`participacao.playerId`), nunca o corpo.
    async avaliar(participacao, matchId, dados) {
      const partida = await partidaOuFalhar(participacao.groupId, matchId)
      const nota = validarAvaliacao(dados)
      const raterId = participacao.playerId ?? null
      verificarPodeAvaliar({ partida, avaliadorId: raterId, avaliadoId: nota.ratedId, agora: agora() })
      return ratingsRepo.salvar({ matchId, raterId, ...nota })
    },

    // Tela pós-partida: quem eu ainda não avaliei e até quando posso.
    async pendentes(participacao, matchId) {
      const partida = await partidaOuFalhar(participacao.groupId, matchId)
      const raterId = participacao.playerId ?? null
      const prazo = prazoDe(partida)
      const aberta = partida.status === 'FINISHED' && prazo !== null && agora() <= prazo
      const feitas = raterId === null ? [] : await ratingsRepo.listarDoAvaliador(matchId, raterId)
      const ids = aberta ? avaliacoesPendentes({ partida, avaliadorId: raterId, avaliacoes: feitas }) : []
      return {
        open: aberta,
        deadline: prazo,
        pending: ids.map((playerId) => ({ playerId, nickname: apelidoDe(partida, playerId) })),
      }
    },

    // As notas que EU dei nesta partida (para a tela permitir editar). Nunca as de outras pessoas.
    async minhas(participacao, matchId) {
      const partida = await partidaOuFalhar(participacao.groupId, matchId)
      const raterId = participacao.playerId ?? null
      if (raterId === null) return []
      const feitas = await ratingsRepo.listarDoAvaliador(matchId, raterId)
      return feitas.map((n) => ({
        ratedId: n.ratedId,
        nickname: apelidoDe(partida, n.ratedId),
        score: n.score,
        comment: n.comment ?? null,
      }))
    },

    async destaque(groupId, matchId) {
      const partida = await partidaOuFalhar(groupId, matchId)
      if (partida.status !== 'FINISHED') return null
      const avaliacoes = await ratingsRepo.listarDaPartida(matchId)
      const destaque = destaqueDaPartida({ avaliacoes, gols: partida.goals ?? [] })
      return destaque && { ...destaque, nickname: apelidoDe(partida, destaque.playerId) }
    },

    async notasDoJogador(groupId, playerId) {
      const jogador = await playersRepo.buscarPorId(playerId)
      if (!jogador || jogador.groupId !== groupId) throw new NotFoundError('Jogador não encontrado')
      const resumo = resumoDeNotas(await ratingsRepo.listarRecebidas(playerId))
      return {
        ...resumo,
        mensagem: resumo.geral.average === null ? 'sem avaliações suficientes' : null,
      }
    },
  }
}
