// Casos de uso da lista de presença e dos convidados. Partidas e jogadores vêm pelos repositórios
// dos respectivos módulos; a decisão (confirmado x espera, quem pode mexer) é do núcleo.
// Tudo DENTRO do grupo de quem pede: partida ou jogador de outro grupo é tratado como inexistente.
import { BusinessRuleError, NotFoundError } from '../../errors/AppError.js'
import {
  jogadorDaPresenca,
  lerConvidado,
  lerTalvez,
  montarLista,
  quemConvida,
  verificarListaAberta,
  verificarPodeMexer,
  verificarPodeTirarConvidado,
} from './attendance.core.js'

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
      convidados: await attendanceRepo.listarConvidados(partida.id),
      maxPlayers: partida.maxPlayers ?? null,
      meuJogadorId: participacao.playerId ?? null,
    })
  }

  return {
    async listar(participacao, matchId) {
      return lista(participacao, await partidaDoGrupo(participacao.groupId, matchId))
    },

    // Corpo: {} = confirmo o MEU nome; { maybe: true } = "talvez" (vou para a espera);
    // { playerId } = admin põe outro jogador do grupo. Quem já está na lista e manda o outro
    // estado troca entre confirmado e talvez.
    async confirmar(participacao, matchId, corpo) {
      const partida = await partidaDoGrupo(participacao.groupId, matchId)
      verificarListaAberta(partida)
      const playerId = jogadorDaPresenca(participacao, corpo)
      if (!idValido(playerId)) throw new BusinessRuleError('Jogador inválido (playerId)')
      const maybe = lerTalvez(corpo)
      verificarPodeMexer({ participacao, playerId })
      const jogador = await playersRepo.buscarPorId(playerId)
      if (!jogador || jogador.groupId !== participacao.groupId) throw new NotFoundError('Jogador não encontrado')
      if (!jogador.active) throw new BusinessRuleError(`Jogador inativo não entra na lista: ${jogador.nickname}`)
      const atual = (await attendanceRepo.listarDaPartida(matchId)).find((p) => p.playerId === playerId)
      if (!atual) await attendanceRepo.adicionar({ matchId, playerId, maybe })
      else if (atual.maybe !== maybe) await attendanceRepo.mudarTalvez({ matchId, playerId, maybe })
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

    // Qualquer membro com jogador leva um convidado; admin sem jogador também pode pôr.
    async convidar(participacao, matchId, corpo) {
      const partida = await partidaDoGrupo(participacao.groupId, matchId)
      verificarListaAberta(partida)
      const name = lerConvidado(corpo)
      await attendanceRepo.adicionarConvidado({ matchId, name, invitedById: quemConvida(participacao) })
      return lista(participacao, partida)
    },

    async tirarConvidado(participacao, matchId, guestId) {
      const partida = await partidaDoGrupo(participacao.groupId, matchId)
      verificarListaAberta(partida)
      const convidado = await attendanceRepo.buscarConvidado(guestId)
      if (!convidado || convidado.matchId !== matchId) throw new NotFoundError('Convidado não encontrado')
      verificarPodeTirarConvidado({ participacao, convidado })
      await attendanceRepo.removerConvidado(guestId)
      return lista(participacao, partida)
    },
  }
}
