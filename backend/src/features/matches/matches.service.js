// Casos de uso das partidas: lê o que precisa, pede a decisão ao núcleo
// (matches.core.js) e grava. Recebe os repositórios por parâmetro para ser
// testado sem banco. Jogadores são lidos pelo repositório de jogadores
// (interface do módulo players), nunca direto na tabela.
import { NotFoundError } from '../../errors/AppError.js'
import {
  lerIdsDoTime,
  validarDadosDaPartida,
  validarEscalacao,
  verificarEscalacaoEditavel,
  verificarPodeIniciar,
} from './matches.core.js'

export function criarMatchesService({ matchesRepo, playersRepo }) {
  async function buscarOuFalhar(id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida) throw new NotFoundError('Partida não encontrada')
    return partida
  }

  return {
    listar() {
      return matchesRepo.listar()
    },

    buscar(id) {
      return buscarOuFalhar(id)
    },

    criar(dados) {
      return matchesRepo.criar(validarDadosDaPartida(dados))
    },

    // PUT da escalação: substitui os dois times de uma vez.
    async definirEscalacao(id, dados) {
      const partida = await buscarOuFalhar(id)
      verificarEscalacaoEditavel(partida)
      const teamA = lerIdsDoTime(dados.teamA, 'A')
      const teamB = lerIdsDoTime(dados.teamB, 'B')
      const jogadores = await playersRepo.buscarPorIds([...new Set([...teamA, ...teamB])])
      const escalacao = validarEscalacao({ teamA, teamB, jogadores })
      return matchesRepo.substituirEscalacao(id, escalacao)
    },

    async iniciar(id) {
      const partida = await buscarOuFalhar(id)
      verificarPodeIniciar(partida)
      return matchesRepo.mudarStatus(id, { de: 'SCHEDULED', para: 'IN_PROGRESS' })
    },
  }
}
