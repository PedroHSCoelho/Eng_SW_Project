// Casos de uso das avaliações: lê o que precisa, pede a decisão ao núcleo
// (ratings.core.js) e grava. Partidas e jogadores vêm pelos repositórios dos
// respectivos módulos (nunca direto na tabela).
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
  async function partidaOuFalhar(id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida) throw new NotFoundError('Partida não encontrada')
    return partida
  }
  const apelidoDe = (partida, playerId) =>
    partida.players.find((p) => p.playerId === playerId)?.player?.nickname ?? null

  return {
    // O avaliador é SEMPRE o jogador ligado à conta logada (`usuario.playerId`), nunca o corpo.
    async avaliar(matchId, usuario, dados) {
      const partida = await partidaOuFalhar(matchId)
      const nota = validarAvaliacao(dados)
      const raterId = usuario.playerId ?? null
      verificarPodeAvaliar({ partida, avaliadorId: raterId, avaliadoId: nota.ratedId, agora: agora() })
      return ratingsRepo.salvar({ matchId, raterId, ...nota })
    },

    // Tela pós-partida: quem eu ainda não avaliei e até quando posso.
    async pendentes(matchId, usuario) {
      const partida = await partidaOuFalhar(matchId)
      const raterId = usuario.playerId ?? null
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
    async minhas(matchId, usuario) {
      const partida = await partidaOuFalhar(matchId)
      const raterId = usuario.playerId ?? null
      if (raterId === null) return []
      const feitas = await ratingsRepo.listarDoAvaliador(matchId, raterId)
      return feitas.map((n) => ({
        ratedId: n.ratedId,
        nickname: apelidoDe(partida, n.ratedId),
        score: n.score,
        comment: n.comment ?? null,
      }))
    },

    async destaque(matchId) {
      const partida = await partidaOuFalhar(matchId)
      if (partida.status !== 'FINISHED') return null
      const avaliacoes = await ratingsRepo.listarDaPartida(matchId)
      const destaque = destaqueDaPartida({ avaliacoes, gols: partida.goals ?? [] })
      return destaque && { ...destaque, nickname: apelidoDe(partida, destaque.playerId) }
    },

    async notasDoJogador(playerId) {
      if (!(await playersRepo.buscarPorId(playerId))) throw new NotFoundError('Jogador não encontrado')
      const resumo = resumoDeNotas(await ratingsRepo.listarRecebidas(playerId))
      return {
        ...resumo,
        mensagem: resumo.geral.average === null ? 'sem avaliações suficientes' : null,
      }
    },
  }
}
