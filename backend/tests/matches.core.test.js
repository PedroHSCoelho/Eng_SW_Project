import { describe, expect, it } from 'vitest'
import {
  lerIdsDoTime,
  validarDadosDaPartida,
  validarEscalacao,
  verificarEscalacaoEditavel,
  verificarPodeIniciar,
} from '../src/features/matches/matches.core.js'

// Seis jogadores ativos (ids 1 a 6) e um inativo (id 7).
const jogadores = [
  ...[1, 2, 3, 4, 5, 6].map((id) => ({ id, nickname: `J${id}`, active: true })),
  { id: 7, nickname: 'Parado', active: false },
]

// Partida com `a` jogadores no time A e `b` no time B.
function partidaCom(a, b, status = 'SCHEDULED') {
  const players = [
    ...Array.from({ length: a }, (_, i) => ({ playerId: i + 1, team: 'A' })),
    ...Array.from({ length: b }, (_, i) => ({ playerId: i + 10, team: 'B' })),
  ]
  return { id: 1, status, players }
}

describe('validarDadosDaPartida', () => {
  it('aceita data ISO e local, tira espaços e descarta campos extras', () => {
    const dados = validarDadosDaPartida({
      date: '2026-11-20T19:00:00-03:00',
      location: '  Quadra da UNIFESP  ',
      status: 'FINISHED',
    })
    expect(dados).toEqual({ date: new Date('2026-11-20T22:00:00Z'), location: 'Quadra da UNIFESP' })
  })

  it.each([[undefined], ['amanhã'], [20261120]])('rejeita data %s', (date) => {
    expect(() => validarDadosDaPartida({ date, location: 'Quadra' })).toThrow('Data inválida')
  })

  it.each([[undefined], ['Q'], ['x'.repeat(101)]])('rejeita local %s', (location) => {
    expect(() => validarDadosDaPartida({ date: '2026-11-20T19:00', location })).toThrow('Local')
  })
})

describe('lerIdsDoTime', () => {
  it('aceita lista de inteiros positivos, inclusive vazia', () => {
    expect(lerIdsDoTime([1, 2], 'A')).toEqual([1, 2])
    expect(lerIdsDoTime([], 'B')).toEqual([])
  })

  it.each([[undefined], ['1,2'], [[1, '2']], [[0]], [[1.5]]])('rejeita %j', (valor) => {
    expect(() => lerIdsDoTime(valor, 'A')).toThrow('time A')
  })
})

describe('validarEscalacao', () => {
  it('devolve cada jogador com o seu time', () => {
    expect(validarEscalacao({ teamA: [1, 2], teamB: [3], jogadores })).toEqual([
      { playerId: 1, team: 'A' },
      { playerId: 2, team: 'A' },
      { playerId: 3, team: 'B' },
    ])
  })

  it('não aceita o mesmo jogador duas vezes no mesmo time', () => {
    expect(() => validarEscalacao({ teamA: [1, 1], teamB: [], jogadores })).toThrow('repetido no time A')
  })

  it('não aceita o mesmo jogador nos dois times', () => {
    expect(() => validarEscalacao({ teamA: [1, 2], teamB: [2, 3], jogadores })).toThrow('nos dois times')
  })

  it('não aceita jogador que não existe', () => {
    expect(() => validarEscalacao({ teamA: [99], teamB: [], jogadores })).toThrow('Jogador 99 não existe')
  })

  it('não aceita jogador inativo', () => {
    expect(() => validarEscalacao({ teamA: [1], teamB: [7], jogadores })).toThrow('inativo')
  })
})

describe('verificarEscalacaoEditavel', () => {
  it('partida agendada pode mudar a escalação', () => {
    expect(() => verificarEscalacaoEditavel(partidaCom(0, 0))).not.toThrow()
  })

  it.each([['IN_PROGRESS'], ['FINISHED']])('partida %s não pode', (status) => {
    expect(() => verificarEscalacaoEditavel(partidaCom(3, 3, status))).toThrow('agendada')
  })
})

describe('verificarPodeIniciar', () => {
  it('começa com 3 jogadores em cada time', () => {
    expect(() => verificarPodeIniciar(partidaCom(3, 3))).not.toThrow()
  })

  it('não começa se um dos times tem menos de 3', () => {
    expect(() => verificarPodeIniciar(partidaCom(3, 2))).toThrow('time B tem 2')
    expect(() => verificarPodeIniciar(partidaCom(0, 5))).toThrow('time A tem 0')
  })

  it('não começa duas vezes', () => {
    expect(() => verificarPodeIniciar(partidaCom(3, 3, 'IN_PROGRESS'))).toThrow('Só uma partida agendada')
  })
})
