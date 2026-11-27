// Núcleo puro do formato Pelada (vários times, vários jogos na noite).
import { describe, expect, it } from 'vitest'
import {
  classificacaoDaPelada,
  desempenhoNoJogo,
  lerFormato,
  montarJogo,
  placarDoJogo,
  resultadoDoJogo,
  timesDaPartida,
  verificarLanceNoJogo,
} from '../src/features/matches/core/pelada.core.js'
import { montarGol } from '../src/features/matches/core/goals.core.js'
import { lerEscalacao, validarDadosDaPartida, verificarPodeIniciar } from '../src/features/matches/core/matches.core.js'

// Pelada de 3 times: A (1, 2, 3), B (4, 5, 6), C (7, 8, 9).
const escalacao = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((playerId) => ({ playerId, team: 'ABC'[Math.floor((playerId - 1) / 3)] }))
const pelada = (extra = {}) => ({ format: 'PELADA', teamCount: 3, status: 'IN_PROGRESS', players: escalacao, goals: [], games: [], ...extra })
const aberto = { id: 10, number: 1, homeTeam: 'A', awayTeam: 'C', result: null, finishedAt: null }

describe('lerFormato', () => {
  it('sem nada = jogo único com 2 times (como era antes)', () => {
    expect(lerFormato({})).toEqual({ format: 'SINGLE_GAME', teamCount: 2 })
    expect(() => lerFormato({ format: 'SINGLE_GAME', teamCount: 3 })).toThrow('2 times')
  })

  it('pelada: de 3 a 6 times (padrão 3)', () => {
    expect(lerFormato({ format: 'PELADA' })).toEqual({ format: 'PELADA', teamCount: 3 })
    expect(lerFormato({ format: 'PELADA', teamCount: 6 }).teamCount).toBe(6)
    expect(() => lerFormato({ format: 'PELADA', teamCount: 2 })).toThrow('3 a 6')
    expect(() => lerFormato({ format: 'PELADA', teamCount: 7 })).toThrow('3 a 6')
    expect(() => lerFormato({ format: 'TORNEIO' })).toThrow('Formato inválido')
  })

  it('validarDadosDaPartida inclui o formato', () => {
    const dados = validarDadosDaPartida({ date: '2026-11-27T20:00', location: 'Quadra', format: 'PELADA', teamCount: 4 })
    expect(dados).toMatchObject({ format: 'PELADA', teamCount: 4 })
    expect(timesDaPartida(dados)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('escalação e início da pelada', () => {
  it('lê teamC na pelada e recusa time que a partida não tem', () => {
    expect(lerEscalacao({ teamA: [1], teamB: [2], teamC: [3] }, pelada())).toEqual({ A: [1], B: [2], C: [3] })
    expect(lerEscalacao({ teamA: [1], teamB: [2] }, pelada()).C).toEqual([])
    expect(() => lerEscalacao({ teamA: [1], teamB: [2], teamD: [4] }, pelada())).toThrow('não há Time D')
    expect(() => lerEscalacao({ teamA: [1], teamB: [2], teamC: [3] }, { format: 'SINGLE_GAME', teamCount: 2 })).toThrow('não há Time C')
  })

  it('para começar, TODOS os times da pelada precisam de 3 jogadores', () => {
    expect(() => verificarPodeIniciar({ ...pelada(), status: 'SCHEDULED' })).not.toThrow()
    const semC = { ...pelada(), status: 'SCHEDULED', players: escalacao.filter((p) => p.team !== 'C') }
    expect(() => verificarPodeIniciar(semC)).toThrow('time C tem 0')
  })
})

describe('jogos da noite', () => {
  it('começa um jogo entre dois times da pelada, numerado na ordem', () => {
    expect(montarJogo({ partida: pelada(), jogo: { homeTeam: 'A', awayTeam: 'B' } })).toEqual({ homeTeam: 'A', awayTeam: 'B', number: 1 })
    const comUm = pelada({ games: [{ ...aberto, finishedAt: '2026-11-27T21:00:00Z', result: 'DRAW' }] })
    expect(montarJogo({ partida: comUm, jogo: { homeTeam: 'C', awayTeam: 'B' } }).number).toBe(2)
  })

  it('recusa: jogo único, partida fora de andamento, jogo já aberto, mesmo time, time que não existe', () => {
    const jogo = { homeTeam: 'A', awayTeam: 'B' }
    expect(() => montarJogo({ partida: { ...pelada(), format: 'SINGLE_GAME' }, jogo })).toThrow('Só a pelada')
    expect(() => montarJogo({ partida: pelada({ status: 'SCHEDULED' }), jogo })).toThrow('em andamento')
    expect(() => montarJogo({ partida: pelada({ games: [aberto] }), jogo })).toThrow('Encerre o jogo atual')
    expect(() => montarJogo({ partida: pelada(), jogo: { homeTeam: 'A', awayTeam: 'A' } })).toThrow('ele mesmo')
    expect(() => montarJogo({ partida: pelada(), jogo: { homeTeam: 'A', awayTeam: 'D' } })).toThrow('A, B, C')
  })

  it('placar e resultado do jogo saem dos gols dele (gameId)', () => {
    const gols = [{ gameId: 10, team: 'A' }, { gameId: 10, team: 'A' }, { gameId: 10, team: 'C' }, { gameId: 9, team: 'C' }]
    expect(placarDoJogo(aberto, gols)).toEqual({ home: 2, away: 1 })
    expect(resultadoDoJogo({ home: 2, away: 1 })).toBe('HOME_WINS')
    expect(resultadoDoJogo({ home: 0, away: 1 })).toBe('AWAY_WINS')
    expect(resultadoDoJogo({ home: 1, away: 1 })).toBe('DRAW')
  })
})

describe('gols e lances na pelada', () => {
  it('só com jogo aberto e de quem está num dos dois times dele', () => {
    expect(() => verificarLanceNoJogo(pelada(), 1)).toThrow('Comece um jogo')
    expect(verificarLanceNoJogo(pelada({ games: [aberto] }), 7).id).toBe(10)
    expect(() => verificarLanceNoJogo(pelada({ games: [aberto] }), 4)).toThrow('fora dele')
  })

  it('o gol vai com o gameId; o gol contra conta para o OUTRO time do jogo (não para B)', () => {
    const partida = pelada({ games: [aberto] })
    expect(montarGol({ partida, gol: { scorerId: 1, assistId: 2, minute: null, ownGoal: false } })).toMatchObject({ team: 'A', gameId: 10 })
    expect(montarGol({ partida, gol: { scorerId: 1, assistId: null, minute: null, ownGoal: true } })).toMatchObject({ team: 'C', gameId: 10 })
  })
})

describe('classificação e desempenho', () => {
  // Jogo 1: A 2 x 0 C. Jogo 2: B 1 x 1 A. Jogo 3 (aberto): C x B, não conta.
  const jogos = [
    { id: 1, number: 1, homeTeam: 'A', awayTeam: 'C', result: 'HOME_WINS', finishedAt: 'x' },
    { id: 2, number: 2, homeTeam: 'B', awayTeam: 'A', result: 'DRAW', finishedAt: 'x' },
    { id: 3, number: 3, homeTeam: 'C', awayTeam: 'B', result: null, finishedAt: null },
  ]
  const gols = [{ gameId: 1, team: 'A' }, { gameId: 1, team: 'A' }, { gameId: 2, team: 'B' }, { gameId: 2, team: 'A' }, { gameId: 3, team: 'C' }]

  it('desempenho de um time num jogo (null se não jogou ou se o jogo está aberto)', () => {
    expect(desempenhoNoJogo(jogos[0], 'A', gols)).toEqual({ resultado: 'V', pro: 2, contra: 0 })
    expect(desempenhoNoJogo(jogos[0], 'C', gols)).toEqual({ resultado: 'D', pro: 0, contra: 2 })
    expect(desempenhoNoJogo(jogos[0], 'B', gols)).toBeNull()
    expect(desempenhoNoJogo(jogos[2], 'C', gols)).toBeNull()
  })

  it('classificação da noite: pontos, saldo, gols', () => {
    const tabela = classificacaoDaPelada(pelada({ games: jogos, goals: gols }))
    expect(tabela.map((l) => [l.team, l.games, l.wins, l.draws, l.losses, l.points])).toEqual([
      ['A', 2, 1, 1, 0, 4],
      ['B', 1, 0, 1, 0, 1],
      ['C', 1, 0, 0, 1, 0],
    ])
  })
})
