// Núcleo puro do histórico de partidas: filtros, ordem, paginação e placar. Sem banco nem Express.
// Reaproveita as funções puras de período das estatísticas (mesma regra: [de, ate), `ate` exclusivo).
import { ValidationError } from '../../errors/AppError.js'
import { filtrarPorPeriodo, lerIntervaloExplicito } from '../stats/stats.core.js'
import { calcularPlacar } from './matches.core.js'
import { classificacaoDaPelada, timesDaPartida } from './pelada.core.js'

export const TAMANHO_PADRAO = 10
export const TAMANHO_MAXIMO = 50

// Lê um inteiro da query (que chega como texto). Ausente/vazio = null.
function inteiro(valor, minimo, maximo, mensagem) {
  if (valor === undefined || valor === '') return null
  const numero = typeof valor === 'string' ? Number(valor) : NaN
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) throw new ValidationError(mensagem)
  return numero
}

// Valida a entrada externa (?page=&pageSize=&playerId=&de=&ate=) e devolve os filtros prontos.
export function lerFiltrosDoHistorico(query) {
  return {
    ...lerIntervaloExplicito({ de: query.de, ate: query.ate }),
    playerId: inteiro(query.playerId, 1, Number.MAX_SAFE_INTEGER, 'Jogador inválido (playerId)'),
    page: inteiro(query.page, 1, Number.MAX_SAFE_INTEGER, 'Página inválida') ?? 1,
    pageSize:
      inteiro(query.pageSize, 1, TAMANHO_MAXIMO, `Tamanho de página inválido (1 a ${TAMANHO_MAXIMO})`) ??
      TAMANHO_PADRAO,
  }
}

// Só partidas finalizadas, mais recentes primeiro, com filtros e uma página de resultados.
// O `total` conta depois dos filtros (para a tela saber quantas páginas existem).
export function montarHistorico(partidas, { de, ate, playerId, page, pageSize }) {
  let lista = partidas.filter((p) => p.status === 'FINISHED')
  lista = filtrarPorPeriodo(lista, { de, ate })
  if (playerId !== null) lista = lista.filter((p) => p.players.some((j) => j.playerId === playerId))

  lista = [...lista].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)

  const inicio = (page - 1) * pageSize
  return {
    items: lista.slice(inicio, inicio + pageSize).map((p) => ({
      id: p.id,
      date: p.date,
      location: p.location,
      result: p.result,
      format: p.format ?? 'SINGLE_GAME',
      teamNames: p.teamNames ?? null,
      score: calcularPlacar(p.goals, timesDaPartida(p)),
      // Pelada: quantos jogos teve e quem terminou a noite na frente.
      ...(p.format === 'PELADA' && {
        gamesCount: (p.games ?? []).length,
        leader: classificacaoDaPelada(p)[0]?.team ?? null,
      }),
    })),
    page,
    pageSize,
    total: lista.length,
    totalPages: Math.ceil(lista.length / pageSize),
  }
}
