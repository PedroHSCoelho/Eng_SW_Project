// Casos de uso das estatísticas e do ranking: lê as partidas finalizadas, pede o cálculo
// ao núcleo (stats.core.js) e devolve. Não grava nada: tudo é derivado das súmulas.
// Partidas e jogadores vêm pelos repositórios dos respectivos módulos (nunca direto na tabela).
import { NotFoundError } from '../../errors/AppError.js'
import {
  estatisticasDoJogador,
  filtrarPorPeriodo,
  intervaloDoPeriodo,
  lerPeriodoDasEstatisticas,
  lerPosicao,
  montarRanking,
  ultimasPartidas,
} from './stats.core.js'

export function criarStatsService({ matchesRepo, playersRepo, agora = () => new Date() }) {
  return {
    async estatisticasDoJogador(playerId, query = {}) {
      const jogador = await playersRepo.buscarPorId(playerId)
      if (!jogador) throw new NotFoundError('Jogador não encontrado')
      const intervalo = lerPeriodoDasEstatisticas(query, agora())
      const partidas = filtrarPorPeriodo(await matchesRepo.listarFinalizadas(), intervalo)
      // `recentes` alimenta o perfil (últimas 5 partidas como V, E ou D), respeitando o mesmo período.
      return { ...estatisticasDoJogador(playerId, partidas), recentes: ultimasPartidas(playerId, partidas) }
    },

    // periodo: 'mes' | 'ano' | 'tudo' (padrão: tudo); posicao (opcional): só jogadores dessa posição
    async ranking({ periodo = 'tudo', posicao } = {}) {
      const intervalo = intervaloDoPeriodo(periodo, agora())
      const filtroDePosicao = lerPosicao(posicao)
      const partidas = filtrarPorPeriodo(await matchesRepo.listarFinalizadas(), intervalo)
      // Jogadores inativos continuam no ranking: o histórico deles não some.
      const cadastros = await playersRepo.listar({ busca: '', apenasAtivos: false })
      const jogadores = filtroDePosicao ? cadastros.filter((j) => j.position === filtroDePosicao) : cadastros
      return montarRanking({ partidas, jogadores })
    },
  }
}
