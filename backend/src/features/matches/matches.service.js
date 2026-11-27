// Casos de uso das partidas: lê o que precisa, pede a decisão ao núcleo
// (matches.core.js) e grava. Recebe os repositórios por parâmetro para ser
// testado sem banco. Jogadores são lidos pelo repositório de jogadores
// (interface do módulo players), nunca direto na tabela.
// Todo caso de uso recebe o grupo (groupId) de quem pede: partida ou jogador de outro grupo
// é tratado como inexistente.
import { BusinessRuleError, NotFoundError } from '../../errors/AppError.js'
import {
  calcularPlacar,
  escaladosParaALista,
  lerEscalacao,
  lerSubstituicao,
  montarSubstituicao,
  resultadoDoPlacar,
  validarDadosDaPartida,
  validarEscalacao,
  verificarEscalacaoEditavel,
  verificarPodeCancelar,
  verificarPodeEditar,
  verificarPodeEncerrar,
  verificarPodeIniciar,
  verificarTimesDaEscalacao,
} from './matches.core.js'
import {
  classificacaoDaPelada,
  ehPelada,
  jogoAberto,
  lerDadosDoJogo,
  montarJogo,
  placarDoJogo,
  resultadoDoJogo,
  timesDaPartida,
  verificarPodeEncerrarJogo,
} from './pelada.core.js'
import { lerDadosDoGol, montarGol, verificarSumulaAberta } from './goals.core.js'
import { lerDadosDoEvento, montarEvento } from './events.core.js'
import { lerFiltrosDoHistorico, montarHistorico } from './history.core.js'

// A partida sempre sai com o placar calculado na hora (`score`, um número por time).
// Na pelada, cada jogo sai com o seu placar e a partida traz a classificação da noite (`standings`).
function comPlacar(partida) {
  const gols = partida.goals ?? []
  const comTudo = {
    ...partida,
    teamNames: partida.teamNames ?? null,
    score: calcularPlacar(gols, timesDaPartida(partida)),
  }
  if (!ehPelada(partida)) return comTudo
  return {
    ...comTudo,
    games: (partida.games ?? []).map((j) => ({ ...j, score: placarDoJogo(j, gols) })),
    standings: classificacaoDaPelada(partida),
  }
}

// Na pelada, o gol ou lance de um jogo já encerrado não sai mais (o resultado dele está gravado).
function verificarJogoDoLanceAberto(partida, lance) {
  if (!ehPelada(partida) || !lance?.gameId) return
  const jogo = (partida.games ?? []).find((j) => j.id === lance.gameId)
  if (jogo?.finishedAt) throw new BusinessRuleError(`O jogo ${jogo.number} já foi encerrado; o lance não pode mais ser removido`)
}

// `attendanceRepo` (repositório da lista de presença) é opcional: com ele, quem é escalado
// também entra na lista de presença como confirmado.
export function criarMatchesService({ matchesRepo, playersRepo, attendanceRepo = null, agora = () => new Date() }) {
  async function buscarOuFalhar(groupId, id) {
    const partida = await matchesRepo.buscarPorId(id)
    if (!partida || partida.groupId !== groupId) throw new NotFoundError('Partida não encontrada')
    return partida
  }

  return {
    // Cada partida da lista traz o placar (calculado dos gols), sem a lista de gols.
    async listar(groupId) {
      // `attendance`: quantos estão na lista de presença (confirmados + espera) e as vagas.
      return (await matchesRepo.listar(groupId)).map(
        ({ id, date, location, status, result, goals, maxPlayers = null, format = 'SINGLE_GAME', teamCount = 2, teamNames = null, _count }) => ({
          id, date, location, status, result, format, teamCount, teamNames,
          score: calcularPlacar(goals ?? [], timesDaPartida({ teamCount })),
          attendance: { total: _count?.attendances ?? 0, maxPlayers },
          gamesCount: _count?.games ?? 0,
        }),
      )
    },

    // Histórico: partidas finalizadas com filtros e paginação (a decisão é do núcleo).
    async historico(groupId, query) {
      return montarHistorico(await matchesRepo.listarFinalizadas(groupId), lerFiltrosDoHistorico(query))
    },

    async buscar(groupId, id) {
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    async criar(groupId, dados) {
      return comPlacar(await matchesRepo.criar({ ...validarDadosDaPartida(dados), groupId }))
    },

    // Edita data e local (só enquanto agendada). Status, resultado e id enviados no corpo são descartados.
    async atualizar(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      verificarPodeEditar(partida)
      const novos = validarDadosDaPartida(dados)
      verificarTimesDaEscalacao(partida, novos)
      return comPlacar(await matchesRepo.atualizarDados(id, novos))
    },

    // Cancela uma partida agendada ou em andamento. O `de` é o estado lido agora: se mudar no
    // meio do caminho (ex.: alguém encerrou), o repositório recusa em vez de sobrescrever.
    async cancelar(groupId, id) {
      const partida = await buscarOuFalhar(groupId, id)
      verificarPodeCancelar(partida)
      return comPlacar(await matchesRepo.mudarStatus(id, { de: partida.status, para: 'CANCELED' }))
    },

    // PUT da escalação: substitui os dois times de uma vez.
    async definirEscalacao(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      verificarEscalacaoEditavel(partida)
      const times = lerEscalacao(dados, partida) // { A: [...], B: [...], C: [...] }
      // Só jogadores do MESMO grupo contam: um de outro grupo cai na regra "jogador não existe".
      const cadastros = await playersRepo.buscarPorIds([...new Set(Object.values(times).flat())])
      const jogadores = cadastros.filter((j) => j.groupId === groupId)
      const porChave = Object.fromEntries(Object.entries(times).map(([t, ids]) => [`team${t}`, ids]))
      const escalacao = validarEscalacao({ ...porChave, jogadores })
      const salva = await matchesRepo.substituirEscalacao(id, escalacao)
      if (attendanceRepo) {
        const { adicionar, confirmar } = escaladosParaALista(escalacao, await attendanceRepo.listarDaPartida(id))
        for (const playerId of adicionar) await attendanceRepo.adicionar({ matchId: id, playerId, maybe: false })
        for (const playerId of confirmar) await attendanceRepo.mudarTalvez({ matchId: id, playerId, maybe: false })
      }
      return comPlacar(salva)
    },

    // Durante a partida: substituição, pôr alguém num time ou tirar alguém de campo.
    // Quem sai continua na súmula (jogou), só fica Sem Time.
    async substituir(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      const substituicao = lerSubstituicao(dados)
      let jogadorQueEntra = null
      if (substituicao.entraId !== null) {
        const jogador = await playersRepo.buscarPorId(substituicao.entraId)
        jogadorQueEntra = jogador && jogador.groupId === groupId ? jogador : null
      }
      const troca = montarSubstituicao({ partida, substituicao, jogadorQueEntra })
      return comPlacar(await matchesRepo.substituir(id, troca))
    },

    async iniciar(groupId, id) {
      const partida = await buscarOuFalhar(groupId, id)
      verificarPodeIniciar(partida)
      return comPlacar(await matchesRepo.mudarStatus(id, { de: 'SCHEDULED', para: 'IN_PROGRESS' }))
    },

    // Encerra: calcula o placar pelos gols, grava o resultado e fecha a súmula.
    // Na pelada não há um resultado único (cada jogo tem o seu): o jogo aberto é encerrado junto.
    async encerrar(groupId, id) {
      const partida = await buscarOuFalhar(groupId, id)
      const momento = agora()
      verificarPodeEncerrar({ partida, agora: momento })
      if (ehPelada(partida)) {
        const aberto = jogoAberto(partida)
        if (aberto) {
          const result = resultadoDoJogo(placarDoJogo(aberto, partida.goals))
          await matchesRepo.encerrarJogo(aberto.id, { result, finishedAt: momento })
        }
        return comPlacar(
          await matchesRepo.mudarStatus(id, { de: 'IN_PROGRESS', para: 'FINISHED', dados: { result: null, finishedAt: momento } }),
        )
      }
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
    async registrarGol(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      const gol = montarGol({ partida, gol: lerDadosDoGol(dados) })
      await matchesRepo.criarGol({ matchId: id, ...gol })
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    // Remove um gol lançado errado, enquanto a partida não foi encerrada.
    async removerGol(groupId, id, goalId) {
      const partida = await buscarOuFalhar(groupId, id)
      const gol = partida.goals.find((g) => g.id === goalId)
      if (!gol) {
        throw new NotFoundError('Gol não encontrado nesta partida')
      }
      verificarSumulaAberta(partida)
      verificarJogoDoLanceAberto(partida, gol)
      await matchesRepo.removerGol(goalId)
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    // Lança um cartão ou uma defesa difícil e devolve a partida atualizada.
    async registrarEvento(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      const evento = montarEvento({ partida, evento: lerDadosDoEvento(dados) })
      await matchesRepo.criarEvento({ matchId: id, ...evento })
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    // Remove um lance lançado errado, enquanto a partida está em andamento.
    async removerEvento(groupId, id, eventId) {
      const partida = await buscarOuFalhar(groupId, id)
      if (!(partida.events ?? []).some((e) => e.id === eventId)) {
        throw new NotFoundError('Lance não encontrado nesta partida')
      }
      if (partida.status !== 'IN_PROGRESS') {
        throw new BusinessRuleError('Lances só podem ser lançados ou removidos com a partida em andamento')
      }
      verificarJogoDoLanceAberto(partida, partida.events.find((e) => e.id === eventId))
      await matchesRepo.removerEvento(eventId)
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    // Pelada: começa um jogo entre dois times da partida. Corpo: { homeTeam: 'A', awayTeam: 'C' }
    async comecarJogo(groupId, id, dados) {
      const partida = await buscarOuFalhar(groupId, id)
      const jogo = montarJogo({ partida, jogo: lerDadosDoJogo(dados) })
      await matchesRepo.criarJogo({ matchId: id, ...jogo })
      return comPlacar(await buscarOuFalhar(groupId, id))
    },

    // Pelada: encerra o jogo aberto com o resultado calculado pelos gols dele.
    async encerrarJogo(groupId, id, gameId) {
      const partida = await buscarOuFalhar(groupId, id)
      const jogo = verificarPodeEncerrarJogo(partida, gameId)
      if (!jogo) throw new NotFoundError('Jogo não encontrado nesta partida')
      const result = resultadoDoJogo(placarDoJogo(jogo, partida.goals))
      await matchesRepo.encerrarJogo(gameId, { result, finishedAt: agora() })
      return comPlacar(await buscarOuFalhar(groupId, id))
    },
  }
}
