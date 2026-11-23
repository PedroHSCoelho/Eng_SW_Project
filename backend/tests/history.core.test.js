// Núcleo puro do histórico: filtros, ordem, paginação e placar. Sem banco nem HTTP.
import { describe, expect, it } from 'vitest'
import { lerFiltrosDoHistorico, montarHistorico } from '../src/features/matches/history.core.js'

const gol = (scorerId, team) => ({ scorerId, assistId: null, team, ownGoal: false })
const partida = (id, date, { status = 'FINISHED', jogadores = [1, 2], goals = [], result = 'DRAW' } = {}) => ({
  id,
  date,
  location: `Quadra ${id}`,
  status,
  result,
  players: jogadores.map((playerId, i) => ({ playerId, team: i % 2 === 0 ? 'A' : 'B' })),
  goals,
})
const ids = (historico) => historico.items.map((p) => p.id)
const semFiltro = { de: null, ate: null, playerId: null, page: 1, pageSize: 10 }

describe('lerFiltrosDoHistorico', () => {
  it('sem parâmetros: padrões (página 1, 10 por página, sem filtros)', () => {
    expect(lerFiltrosDoHistorico({})).toEqual(semFiltro)
  })

  it('lê página, tamanho, jogador e período (valores chegam como texto)', () => {
    const f = lerFiltrosDoHistorico({ page: '2', pageSize: '5', playerId: '3', de: '2026-11-01', ate: '2026-12-01' })
    expect(f).toMatchObject({ page: 2, pageSize: 5, playerId: 3 })
    expect(f.de.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(f.ate.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })

  it.each([
    [{ page: '0' }, 'Página inválida'],
    [{ page: '1.5' }, 'Página inválida'],
    [{ page: 'abc' }, 'Página inválida'],
    [{ pageSize: '0' }, 'Tamanho de página'],
    [{ pageSize: '51' }, 'Tamanho de página'],
    [{ playerId: '0' }, 'Jogador inválido'],
    [{ playerId: 'x' }, 'Jogador inválido'],
    [{ de: 'ontem' }, 'Data inválida'],
    [{ de: '2026-12-01', ate: '2026-11-01' }, 'anterior'],
  ])('rejeita %j', (query, mensagem) => {
    expect(() => lerFiltrosDoHistorico(query)).toThrow(mensagem)
  })
})

describe('montarHistorico', () => {
  const partidas = [
    partida(1, '2026-11-01T20:00:00Z'),
    partida(2, '2026-11-08T20:00:00Z', { jogadores: [1, 3] }),
    partida(3, '2026-11-15T20:00:00Z', { jogadores: [2, 3] }),
    partida(4, '2026-11-22T20:00:00Z', { status: 'IN_PROGRESS', result: null }),
    partida(5, '2026-11-22T20:00:00Z', { status: 'SCHEDULED', result: null }),
  ]

  it('só partidas finalizadas, mais recentes primeiro', () => {
    expect(ids(montarHistorico(partidas, semFiltro))).toEqual([3, 2, 1])
  })

  it('mesma data: a de id maior vem primeiro (ordem estável)', () => {
    const iguais = [partida(1, '2026-11-01T20:00:00Z'), partida(2, '2026-11-01T20:00:00Z')]
    expect(ids(montarHistorico(iguais, semFiltro))).toEqual([2, 1])
  })

  it('filtra por jogador: só as partidas em que ele foi escalado', () => {
    expect(ids(montarHistorico(partidas, { ...semFiltro, playerId: 3 }))).toEqual([3, 2])
    expect(ids(montarHistorico(partidas, { ...semFiltro, playerId: 99 }))).toEqual([])
  })

  it('filtra por período [de, ate)', () => {
    const filtro = { ...semFiltro, de: new Date('2026-11-08T00:00:00Z'), ate: new Date('2026-11-15T20:00:00Z') }
    expect(ids(montarHistorico(partidas, filtro))).toEqual([2]) // `ate` é exclusivo
  })

  it('combina jogador e período', () => {
    const filtro = { ...semFiltro, playerId: 2, de: new Date('2026-11-10T00:00:00Z') }
    expect(ids(montarHistorico(partidas, filtro))).toEqual([3])
  })

  it('cada item traz data, local, resultado e placar calculado dos gols', () => {
    const comGols = [partida(1, '2026-11-01T20:00:00Z', { result: 'A_WINS', goals: [gol(1, 'A'), gol(1, 'A'), gol(2, 'B')] })]
    expect(montarHistorico(comGols, semFiltro).items[0]).toEqual({
      id: 1, date: '2026-11-01T20:00:00Z', location: 'Quadra 1', result: 'A_WINS', score: { A: 2, B: 1 },
    })
  })

  describe('paginação', () => {
    const muitas = Array.from({ length: 25 }, (_, i) => partida(i + 1, `2026-10-${String(i + 1).padStart(2, '0')}T20:00:00Z`))

    it('divide em páginas e informa total e número de páginas', () => {
      const h = montarHistorico(muitas, { ...semFiltro, pageSize: 10 })
      expect(h).toMatchObject({ total: 25, totalPages: 3, page: 1, pageSize: 10 })
      expect(h.items).toHaveLength(10)
      expect(h.items[0].id).toBe(25) // a mais recente
    })

    it('a última página traz o resto, e página além do fim vem vazia', () => {
      expect(montarHistorico(muitas, { ...semFiltro, page: 3 }).items).toHaveLength(5)
      expect(montarHistorico(muitas, { ...semFiltro, page: 4 }).items).toEqual([])
    })

    it('sem partidas: total 0 e 0 páginas', () => {
      expect(montarHistorico([], semFiltro)).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 })
    })

    it('o total conta DEPOIS dos filtros', () => {
      expect(montarHistorico(muitas, { ...semFiltro, de: new Date('2026-10-20T00:00:00Z') }).total).toBe(6)
    })
  })
})
