import { describe, expect, it } from 'vitest'
import {
  calcularPlacar,
  lerIdsDoTime,
  resultadoDoPlacar,
  validarDadosDaPartida,
  lerNomesDosTimes,
  validarEscalacao,
  verificarEscalacaoEditavel,
  verificarPodeCancelar,
  verificarPodeEditar,
  verificarPodeEncerrar,
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
    expect(dados).toEqual({ date: new Date('2026-11-20T22:00:00Z'), location: 'Quadra da UNIFESP', maxPlayers: null, format: 'SINGLE_GAME', teamCount: 2, teamNames: null })
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

describe('calcularPlacar', () => {
  it('conta os gols pelo time que ganhou cada um (inclusive gol contra)', () => {
    const gols = [{ team: 'A' }, { team: 'B', ownGoal: true }, { team: 'A' }]
    expect(calcularPlacar(gols)).toEqual({ A: 2, B: 1 })
  })

  it('sem gols é 0 x 0', () => {
    expect(calcularPlacar([])).toEqual({ A: 0, B: 0 })
  })
})

describe('resultadoDoPlacar', () => {
  it.each([
    [{ A: 2, B: 1 }, 'A_WINS'],
    [{ A: 0, B: 3 }, 'B_WINS'],
    [{ A: 1, B: 1 }, 'DRAW'],
  ])('%j -> %s', (placar, resultado) => {
    expect(resultadoDoPlacar(placar)).toBe(resultado)
  })
})

describe('verificarPodeEncerrar', () => {
  const agora = new Date('2026-11-20T23:00:00Z')
  const jogada = { status: 'IN_PROGRESS', date: new Date('2026-11-20T22:00:00Z') }

  it('partida em andamento e com data passada pode ser encerrada', () => {
    expect(() => verificarPodeEncerrar({ partida: jogada, agora })).not.toThrow()
  })

  it('não encerra duas vezes', () => {
    expect(() => verificarPodeEncerrar({ partida: { ...jogada, status: 'FINISHED' }, agora })).toThrow('já foi encerrada')
  })

  it('não encerra partida que nem começou', () => {
    expect(() => verificarPodeEncerrar({ partida: { ...jogada, status: 'SCHEDULED' }, agora })).toThrow('em andamento')
  })

  it('encerra partida marcada para o futuro (a data não trava)', () => {
    const futura = { ...jogada, date: new Date('2026-11-21T22:00:00Z') }
    expect(() => verificarPodeEncerrar({ partida: futura, agora })).not.toThrow()
  })
})

describe('verificarPodeEditar (data e local só mudam antes de a partida começar)', () => {
  it('agendada: pode editar', () => {
    expect(() => verificarPodeEditar({ status: 'SCHEDULED' })).not.toThrow()
  })

  it.each(['IN_PROGRESS', 'FINISHED', 'CANCELED'])('%s: não pode editar', (status) => {
    expect(() => verificarPodeEditar({ status })).toThrow('Só uma partida agendada pode ser editada')
  })
})

describe('verificarPodeCancelar', () => {
  it.each(['SCHEDULED', 'IN_PROGRESS'])('%s: pode cancelar', (status) => {
    expect(() => verificarPodeCancelar({ status })).not.toThrow()
  })

  it('finalizada não pode ser cancelada (a súmula está fechada)', () => {
    expect(() => verificarPodeCancelar({ status: 'FINISHED' })).toThrow('finalizada não pode ser cancelada')
  })

  it('não cancela duas vezes', () => {
    expect(() => verificarPodeCancelar({ status: 'CANCELED' })).toThrow('já foi cancelada')
  })
})

describe('partida cancelada é recusada por todas as outras ações', () => {
  const cancelada = { ...partidaCom(3, 3), status: 'CANCELED', date: '2026-01-01T00:00:00Z' }

  it('não muda a escalação, não inicia e não encerra', () => {
    expect(() => verificarEscalacaoEditavel(cancelada)).toThrow()
    expect(() => verificarPodeIniciar(cancelada)).toThrow()
    expect(() => verificarPodeEncerrar({ partida: cancelada, agora: new Date('2026-02-01T00:00:00Z') })).toThrow()
  })
})


describe('lerNomesDosTimes (nomes livres dos times)', () => {
  it('aceita os nomes dos times da partida, tirando espaços; vazio usa o padrão', () => {
    expect(lerNomesDosTimes({ A: '  Amarelo ', B: '' }, ['A', 'B'])).toEqual({ A: 'Amarelo' })
    expect(lerNomesDosTimes({ A: 'Amarelo', B: 'Azul', C: 'Verde' }, ['A', 'B', 'C'])).toEqual({ A: 'Amarelo', B: 'Azul', C: 'Verde' })
  })

  it('sem nomes = null; time que a partida não tem é ignorado', () => {
    expect(lerNomesDosTimes(undefined, ['A', 'B'])).toBeNull()
    expect(lerNomesDosTimes({}, ['A', 'B'])).toBeNull()
    expect(lerNomesDosTimes({ C: 'Verde' }, ['A', 'B'])).toBeNull()
  })

  it('nome repetido (sem diferenciar maiúsculas) -> 422; formato ou tamanho inválido -> 400', () => {
    expect(() => lerNomesDosTimes({ A: 'Azul', B: 'azul' }, ['A', 'B'])).toThrow(/mesmo nome/)
    expect(() => lerNomesDosTimes(['Azul'], ['A', 'B'])).toThrow(/inválidos/)
    expect(() => lerNomesDosTimes({ Z: 'Azul' }, ['A', 'B'])).toThrow(/Time inválido/)
    expect(() => lerNomesDosTimes({ A: 3 }, ['A', 'B'])).toThrow(/texto/)
    expect(() => lerNomesDosTimes({ A: 'x'.repeat(21) }, ['A', 'B'])).toThrow(/20 caracteres/)
  })

  it('validarDadosDaPartida guarda os nomes', () => {
    const dados = validarDadosDaPartida({ date: '2026-11-20T19:00', location: 'Quadra', teamNames: { A: 'Com camisa', B: 'Sem camisa' } })
    expect(dados.teamNames).toEqual({ A: 'Com camisa', B: 'Sem camisa' })
  })
})
