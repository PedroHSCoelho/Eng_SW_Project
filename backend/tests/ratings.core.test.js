// Núcleo puro das avaliações: sem banco nem HTTP. O relógio entra por parâmetro (`agora`).
import { describe, expect, it } from 'vitest'
import {
  avaliacoesPendentes,
  calcularMedia,
  destaqueDaPartida,
  resumoDeNotas,
  validarAvaliacao,
  verificarPodeAvaliar,
} from '../src/features/ratings/ratings.core.js'

const ENCERRADA_EM = new Date('2026-11-20T22:00:00Z')
const partida = {
  id: 1,
  status: 'FINISHED',
  finishedAt: ENCERRADA_EM,
  players: [1, 2, 3].map((playerId) => ({ playerId, team: 'A' })).concat([4, 5].map((playerId) => ({ playerId, team: 'B' }))),
  goals: [],
}
const horasDepois = (h) => new Date(ENCERRADA_EM.getTime() + h * 3600_000)

describe('validarAvaliacao', () => {
  it('aceita nota de 1 a 5 e comentário opcional (com espaços cortados)', () => {
    expect(validarAvaliacao({ ratedId: 2, score: 4, comment: '  craque  ' })).toEqual({ ratedId: 2, score: 4, comment: 'craque' })
    expect(validarAvaliacao({ ratedId: 2, score: 1 })).toEqual({ ratedId: 2, score: 1, comment: null })
    expect(validarAvaliacao({ ratedId: 2, score: 5, comment: '   ' }).comment).toBeNull()
  })

  it.each([0, 6, 3.5, '4', null, undefined, NaN])('rejeita nota %s', (score) => {
    expect(() => validarAvaliacao({ ratedId: 2, score })).toThrow('Nota deve ser um número inteiro de 1 a 5')
  })

  it('rejeita avaliado inválido e comentário grande ou que não é texto', () => {
    expect(() => validarAvaliacao({ ratedId: 'x', score: 3 })).toThrow('Avaliado inválido')
    expect(() => validarAvaliacao({ ratedId: 0, score: 3 })).toThrow('Avaliado inválido')
    expect(() => validarAvaliacao({ ratedId: 2, score: 3, comment: 'a'.repeat(201) })).toThrow('Comentário')
    expect(() => validarAvaliacao({ ratedId: 2, score: 3, comment: 42 })).toThrow('Comentário')
  })

  it('descarta campos que o cliente não controla (ex.: raterId, id)', () => {
    expect(validarAvaliacao({ ratedId: 2, score: 3, raterId: 9, id: 7 })).toEqual({ ratedId: 2, score: 3, comment: null })
  })
})

describe('verificarPodeAvaliar', () => {
  const ok = { partida, avaliadorId: 1, avaliadoId: 2, agora: horasDepois(1) }

  it('avaliador e avaliado jogaram, partida finalizada e dentro do prazo: permitido', () => {
    expect(() => verificarPodeAvaliar(ok)).not.toThrow()
  })

  it('conta sem jogador ligado não avalia', () => {
    expect(() => verificarPodeAvaliar({ ...ok, avaliadorId: null })).toThrow('não está ligada a um jogador')
  })

  it('só partida finalizada', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS']) {
      expect(() => verificarPodeAvaliar({ ...ok, partida: { ...partida, status, finishedAt: null } })).toThrow('finalizada')
    }
  })

  it('ninguém avalia a si mesmo', () => {
    expect(() => verificarPodeAvaliar({ ...ok, avaliadoId: 1 })).toThrow('si mesmo')
  })

  it('o avaliador precisa ter jogado a partida', () => {
    expect(() => verificarPodeAvaliar({ ...ok, avaliadorId: 9 })).toThrow('Só quem jogou')
  })

  it('o avaliado precisa ter jogado a partida', () => {
    expect(() => verificarPodeAvaliar({ ...ok, avaliadoId: 9 })).toThrow('não jogou')
  })

  it('prazo de 48h: vale até 48h exatas, depois não', () => {
    expect(() => verificarPodeAvaliar({ ...ok, agora: horasDepois(48) })).not.toThrow()
    expect(() => verificarPodeAvaliar({ ...ok, agora: new Date(horasDepois(48).getTime() + 1) })).toThrow('48 horas')
  })
})

describe('avaliacoesPendentes', () => {
  it('lista quem jogou, exceto o próprio avaliador e quem ele já avaliou', () => {
    const jaFeitas = [{ raterId: 1, ratedId: 2 }, { raterId: 3, ratedId: 4 }] // a do jogador 3 não é do 1
    expect(avaliacoesPendentes({ partida, avaliadorId: 1, avaliacoes: jaFeitas })).toEqual([3, 4, 5])
  })

  it('quem não jogou a partida não tem pendências', () => {
    expect(avaliacoesPendentes({ partida, avaliadorId: 9, avaliacoes: [] })).toEqual([])
  })
})

describe('calcularMedia (mínimo de 3 avaliações, 1 casa decimal)', () => {
  it('com menos de 3 notas não mostra média', () => {
    expect(calcularMedia([5, 5])).toEqual({ average: null, count: 2 })
    expect(calcularMedia([])).toEqual({ average: null, count: 0 })
  })

  it('com 3 ou mais, média com 1 casa', () => {
    expect(calcularMedia([5, 4, 4])).toEqual({ average: 4.3, count: 3 }) // 4,33
    expect(calcularMedia([1, 2, 2, 2])).toEqual({ average: 1.8, count: 4 }) // 1,75
    expect(calcularMedia([3, 3, 3]).average).toBe(3)
  })

  it('o mínimo é configurável', () => {
    expect(calcularMedia([4], 1)).toEqual({ average: 4, count: 1 })
  })
})

describe('resumoDeNotas', () => {
  it('média geral e por partida, cada uma com o seu mínimo de 3', () => {
    const notas = [
      ...[5, 4, 4].map((score) => ({ matchId: 1, score })),
      ...[2, 3].map((score) => ({ matchId: 2, score })),
    ]
    const resumo = resumoDeNotas(notas)
    expect(resumo.geral).toEqual({ average: 3.6, count: 5 }) // 18/5
    expect(resumo.porPartida).toEqual([
      { matchId: 1, average: 4.3, count: 3 },
      { matchId: 2, average: null, count: 2 }, // só 2 notas: não aparece
    ])
  })

  it('sem notas: sem média', () => {
    expect(resumoDeNotas([])).toEqual({ geral: { average: null, count: 0 }, porPartida: [] })
  })
})

describe('destaqueDaPartida', () => {
  const notas = (ratedId, ...scores) => scores.map((score) => ({ ratedId, score }))

  it('maior média da partida (exige 3 notas)', () => {
    const avaliacoes = [...notas(1, 5, 5, 4), ...notas(2, 3, 3, 3), ...notas(3, 5, 5)] // 3 tem só 2 notas
    expect(destaqueDaPartida({ avaliacoes, gols: [] })).toMatchObject({ playerId: 1, average: 4.7 })
  })

  it('empate na média desfeito por gols (gol contra não conta)', () => {
    const avaliacoes = [...notas(1, 4, 4, 4), ...notas(2, 4, 4, 4)]
    const gols = [
      { scorerId: 2, ownGoal: false }, { scorerId: 2, ownGoal: false },
      { scorerId: 1, ownGoal: false }, { scorerId: 1, ownGoal: true }, { scorerId: 1, ownGoal: true },
    ]
    expect(destaqueDaPartida({ avaliacoes, gols }).playerId).toBe(2) // 2 gols x 1 gol válido
  })

  it('sem ninguém com 3 notas: sem destaque', () => {
    expect(destaqueDaPartida({ avaliacoes: notas(1, 5, 5), gols: [] })).toBeNull()
    expect(destaqueDaPartida({ avaliacoes: [], gols: [] })).toBeNull()
  })

  it('empate total: menor id (resultado estável)', () => {
    const avaliacoes = [...notas(7, 4, 4, 4), ...notas(3, 4, 4, 4)]
    expect(destaqueDaPartida({ avaliacoes, gols: [] }).playerId).toBe(3)
  })
})
