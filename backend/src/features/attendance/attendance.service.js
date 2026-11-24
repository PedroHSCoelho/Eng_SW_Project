// Casos de uso da lista de presença. Partidas e jogadores vêm pelos repositórios dos
// respectivos módulos; a decisão (confirmado x espera, quem pode mexer) é do núcleo.
// Tudo DENTRO do grupo de quem pede: partida ou jogador de outro grupo é tratado como inexistente.
import { BusinessRuleError, NotFoundError } from '../../errors/AppError.js'
import { jogadorDaPresenca, montarLista, verificarListaAberta, verificarPodeMexer } from './attendance.core.js'

const idValido = (valor) => Number.isInteger(valor) && valor > 0

export function criarAttendanceService({ attendanceRepo, matchesRepo, playersRepo }) {
  async function partidaDoGrupo(groupId, matchId) {
    const partida = await matchesRepo.buscarPorId(matchId)
    if (!partida || partida.groupId !== groupId) throw new NotFoundError('Partida não encontrada')
    return partida
  }

  async function lista(participacao, partida) {
    return montarLista({
      presencas: await attendanceRepo.listarDaPartida(partida.id),
      maxPlayers: partida.maxPlayers ?? null,
      meuJogadorId: participacao.playerId ?? null,
    })
  }

  return {
    async listar(participacao, matchId) {
      return lista(participacao, await partidaDoGrupo(participacao.groupId, matchId))
    },

    // Corpo: {} = confirmo o MEU nome; { playerId } = organizador põe outro jogador do grupo.
    async confirmar(participacao, matchId, corpo) {
      const partida = await partidaDoGrupo(participacao.groupId, matchId)
      verificarListaAberta(partida)
      const playerId = jogadorDaPresenca(participacao, corpo)
      if (!idValido(playerId)) throw new BusinessRuleError('Jogador inválido (playerId)')
      verificarPodeMexer({ participacao, playerId })
      const jogador = await playersRepo.buscarPorId(playerId)
      if (!jogador || jogador.groupId !== participacao.groupId) throw new NotFoundError('Jogador não encontrado')
      if (!jogador.active) throw new BusinessRuleError(`Jogador inativo não entra na lista: ${jogador.nickname}`)
      await attendanceRepo.adicionar({ matchId, playerId })
      return lista(participacao, partida)
    },

    // Tira o nome da lista: quem estava na espera sobe sozinho (a lista é calculada).
    async sair(participacao, matchId, playerId) {
      const partida = await partidaDoGrupo(participacao.groupId, matchId)
      verificarListaAberta(partida)
      verificarPodeMexer({ participacao, playerId })
      await attendanceRepo.remover({ matchId, playerId })
      return lista(participacao, partida)
    },
  }
}
