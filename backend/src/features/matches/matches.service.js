// Casos de uso das partidas: lê o que precisa, pede a decisão ao núcleo
// (matches.core.js) e grava. Recebe os repositórios por parâmetro para ser
// testado sem banco. Jogadores são lidos pelo repositório de jogadores
// (interface do módulo players), nunca direto na tabela.
import { NotFoundError } from '../../errors/AppError.js'
import {
  calcularPlacar,
  lerIdsDoTime,
  resultadoDoPlacar,
  validarDadosDaPartida,
  validarEscalacao,
  verificarEscalacaoEditavel,
  verificarPodeEncerrar,
  verificarPodeIniciar,
} from './matches.core.js'
import { lerDadosDoGol, montarGol, verificarSumulaAberta } from './goals.core.js'
import { lerFiltrosDoHistorico, montarHistorico } from './history.core.js'

// A partida sempre sai com o placar calculado na hora (`score`).
const comPlacar = (partida) => ({ ...partida, score: calcularPlacar(partida.goals ?? []) })

export function criarMatchesService({ matchesRepo, playersRepo, agora = () => new Date() }) {
  async function buscarOuFalhar(id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida) throw new NotFoundError('Partida não encontrada')
    return partida
  }

  return {
    listar() {
      return matchesRepo.listar()
    },

    // Histórico: partidas finalizadas com filtros e paginação (a decisão é do núcleo).
    async historico(query) {
      return montarHistorico(await matchesRepo.listarFinalizadas(), lerFiltrosDoHistorico(query))
    },

    async buscar(id) {
      return comPlacar(await buscarOuFalhar(id))
    },

    async criar(dados) {
      return comPlacar(await matchesRepo.criar(validarDadosDaPartida(dados)))
    },

    // PUT da escalação: substitui os dois times de uma vez.
    async definirEscalacao(id, dados) {
      const partida = await buscarOuFalhar(id)
      verificarEscalacaoEditavel(partida)
      const teamA = lerIdsDoTime(dados.teamA, 'A')
      const teamB = lerIdsDoTime(dados.teamB, 'B')
      const jogadores = await playersRepo.buscarPorIds([...new Set([...teamA, ...teamB])])
      const escalacao = validarEscalacao({ teamA, teamB, jogadores })
      return comPlacar(await matchesRepo.substituirEscalacao(id, escalacao))
    },

    async iniciar(id) {
      const partida = await buscarOuFalhar(id)
      verificarPodeIniciar(partida)
      return comPlacar(await matchesRepo.mudarStatus(id, { de: 'SCHEDULED', para: 'IN_PROGRESS' }))
    },

    // Encerra: calcula o placar pelos gols, grava o resultado e fecha a súmula.
    async encerrar(id) {
      const partida = await buscarOuFalhar(id)
      const momento = agora()
      verificarPodeEncerrar({ partida, agora: momento })
      const result = resultadoDoPlacar(calcularPlacar(partida.goals))
      return comPlacar(
        await matchesRepo.mudarStatus(id, {
          de: 'IN_PROGRESS',
          para: 'FINISHED',
          dados: { result, finishedAt: momento },
        }),
      )
    },

    // Lança um gol na súmula e devolve a partida atualizada.
    async registrarGol(id, dados) {
      const partida = await buscarOuFalhar(id)
      const gol = montarGol({ partida, gol: lerDadosDoGol(dados) })
      await matchesRepo.criarGol({ matchId: id, ...gol })
      return comPlacar(await buscarOuFalhar(id))
    },

    // Remove um gol lançado errado, enquanto a partida não foi encerrada.
    async removerGol(id, goalId) {
      const partida = await buscarOuFalhar(id)
      if (!partida.goals.some((g) => g.id === goalId)) {
        throw new NotFoundError('Gol não encontrado nesta partida')
      }
      verificarSumulaAberta(partida)
      await matchesRepo.removerGol(goalId)
      return comPlacar(await buscarOuFalhar(id))
    },
  }
}
