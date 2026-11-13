import { describe, expect, it } from 'vitest'
import { lerDadosDoGol, montarGol, verificarSumulaAberta } from '../src/features/matches/goals.core.js'

// Partida em andamento: jogadores 1, 2, 3 no time A; 4, 5, 6 no time B.
const emAndamento = {
  id: 1,
  status: 'IN_PROGRESS',
  players: [1, 2, 3, 4, 5, 6].map((playerId) => ({ playerId, team: playerId <= 3 ? 'A' : 'B' })),
}
const gol = (extra) => ({ scorerId: 1, assistId: null, minute: null, ownGoal: false, ...extra })

describe('lerDadosDoGol', () => {
  it('lê autor, assistência e minuto; ownGoal vira false quando não vem', () => {
    expect(lerDadosDoGol({ scorerId: 1, assistId: 2, minute: 10, team: 'B' })).toEqual({
      scorerId: 1,
      assistId: 2,
      minute: 10,
      ownGoal: false,
    })
  })

  it('assistência e minuto são opcionais', () => {
    expect(lerDadosDoGol({ scorerId: 1 })).toEqual(gol())
  })

  it.each([[{}], [{ scorerId: '1' }], [{ scorerId: 0 }]])('rejeita autor em %j', (dados) => {
    expect(() => lerDadosDoGol(dados)).toThrow('autor')
  })

  it.each([[-1], [121], [10.5], ['10']])('rejeita minuto %j', (minute) => {
    expect(() => lerDadosDoGol({ scorerId: 1, minute })).toThrow('Minuto')
  })

  it('rejeita ownGoal que não é booleano', () => {
    expect(() => lerDadosDoGol({ scorerId: 1, ownGoal: 'sim' })).toThrow('ownGoal')
  })
})

describe('montarGol', () => {
  it('gol normal conta para o time do autor', () => {
    expect(montarGol({ partida: emAndamento, gol: gol({ scorerId: 4, assistId: 5 }) })).toMatchObject({
      scorerId: 4,
      assistId: 5,
      team: 'B',
    })
  })

  it('gol contra conta para o adversário', () => {
    expect(montarGol({ partida: emAndamento, gol: gol({ scorerId: 2, ownGoal: true }) }).team).toBe('B')
  })

  it('autor precisa estar escalado', () => {
    expect(() => montarGol({ partida: emAndamento, gol: gol({ scorerId: 99 }) })).toThrow('escalado')
  })

  it('assistência precisa ser do mesmo time do autor', () => {
    expect(() => montarGol({ partida: emAndamento, gol: gol({ assistId: 4 }) })).toThrow('mesmo time')
  })

  it('assistência de quem não está escalado também é recusada', () => {
    expect(() => montarGol({ partida: emAndamento, gol: gol({ assistId: 99 }) })).toThrow('mesmo time')
  })

  it('autor não dá assistência para o próprio gol', () => {
    expect(() => montarGol({ partida: emAndamento, gol: gol({ assistId: 1 }) })).toThrow('próprio gol')
  })

  it('gol contra não tem assistência', () => {
    expect(() => montarGol({ partida: emAndamento, gol: gol({ ownGoal: true, assistId: 2 }) })).toThrow(
      'Gol contra não tem assistência',
    )
  })

  it.each([['SCHEDULED'], ['FINISHED']])('não aceita gol com a partida %s', (status) => {
    expect(() => montarGol({ partida: { ...emAndamento, status }, gol: gol() })).toThrow('em andamento')
  })
})

describe('verificarSumulaAberta', () => {
  it('só a partida em andamento aceita mudança nos gols', () => {
    expect(() => verificarSumulaAberta(emAndamento)).not.toThrow()
    expect(() => verificarSumulaAberta({ ...emAndamento, status: 'FINISHED' })).toThrow()
  })
})
