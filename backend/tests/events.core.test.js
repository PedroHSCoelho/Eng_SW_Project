// Núcleo puro dos lances (cartões e defesas difíceis): sem banco nem Express.
import { describe, expect, it } from 'vitest'
import { cartoesDoJogador, lerDadosDoEvento, montarEvento } from '../src/features/matches/events.core.js'

const emAndamento = (events = []) => ({
  status: 'IN_PROGRESS',
  players: [{ playerId: 1, team: 'A' }, { playerId: 2, team: 'B' }],
  events,
})

describe('lerDadosDoEvento', () => {
  it('aceita os três tipos e devolve só type, playerId e minute', () => {
    for (const type of ['YELLOW_CARD', 'RED_CARD', 'DIFFICULT_SAVE']) {
      expect(lerDadosDoEvento({ type, playerId: 1, extra: 'x' })).toEqual({ type, playerId: 1, minute: null })
    }
    expect(lerDadosDoEvento({ type: 'RED_CARD', playerId: 1, minute: 30 }).minute).toBe(30)
  })

  it('recusa tipo desconhecido, jogador inválido e minuto fora de 0 a 120', () => {
    expect(() => lerDadosDoEvento({ type: 'GOAL', playerId: 1 })).toThrow('Tipo de lance inválido')
    expect(() => lerDadosDoEvento({ type: 'RED_CARD', playerId: '1' })).toThrow('playerId')
    expect(() => lerDadosDoEvento({ type: 'RED_CARD', playerId: 1, minute: 121 })).toThrow('Minuto')
    expect(() => lerDadosDoEvento({ type: 'RED_CARD', playerId: 1, minute: 2.5 })).toThrow('Minuto')
  })
})

describe('cartoesDoJogador', () => {
  it('2 amarelos ou 1 vermelho = expulso', () => {
    const umAmarelo = [{ playerId: 1, type: 'YELLOW_CARD' }]
    expect(cartoesDoJogador(umAmarelo, 1)).toEqual({ amarelos: 1, vermelhos: 0, expulso: false })
    expect(cartoesDoJogador([...umAmarelo, ...umAmarelo], 1).expulso).toBe(true)
    expect(cartoesDoJogador([{ playerId: 1, type: 'RED_CARD' }], 1).expulso).toBe(true)
    expect(cartoesDoJogador([{ playerId: 2, type: 'RED_CARD' }], 1).expulso).toBe(false)
  })
})

describe('montarEvento', () => {
  const amarelo = { type: 'YELLOW_CARD', playerId: 1, minute: null }

  it('aceita lance de jogador escalado com a partida em andamento', () => {
    expect(montarEvento({ partida: emAndamento(), evento: amarelo })).toEqual(amarelo)
  })

  it('defesa difícil vale para qualquer escalado (o goleiro reveza na pelada)', () => {
    const defesa = { type: 'DIFFICULT_SAVE', playerId: 2, minute: null }
    expect(montarEvento({ partida: emAndamento(), evento: defesa })).toEqual(defesa)
  })

  it('recusa com a partida agendada ou finalizada', () => {
    for (const status of ['SCHEDULED', 'FINISHED', 'CANCELED']) {
      expect(() => montarEvento({ partida: { ...emAndamento(), status }, evento: amarelo })).toThrow('em andamento')
    }
  })

  it('recusa jogador que não está escalado', () => {
    expect(() => montarEvento({ partida: emAndamento(), evento: { ...amarelo, playerId: 9 } })).toThrow('escalado')
  })

  it('expulso não recebe mais lances', () => {
    const partida = emAndamento([{ playerId: 1, type: 'YELLOW_CARD' }, { playerId: 1, type: 'YELLOW_CARD' }])
    expect(() => montarEvento({ partida, evento: amarelo })).toThrow('expulso')
    expect(() => montarEvento({ partida, evento: { ...amarelo, type: 'DIFFICULT_SAVE' } })).toThrow('expulso')
  })
})
