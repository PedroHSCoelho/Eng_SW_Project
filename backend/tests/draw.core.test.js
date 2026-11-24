// Núcleo puro do sorteio de times: listas pequenas com resultado conhecido, sem banco nem HTTP.
// O sorteador (`aleatorio`) entra por parâmetro: com ele fixo o resultado é previsível.
import { describe, expect, it } from 'vitest'
import {
  FORCA_PADRAO,
  MAX_JOGADORES,
  MIN_JOGADORES,
  forcaDoJogador,
  lerIdsDoSorteio,
  sortearTimes,
} from '../src/features/draw/draw.core.js'

// Atalho: jogador com média (null = sem média) e posição (padrão meio-campo).
const j = (id, average, position = 'MIDFIELDER') => ({ id, nickname: `J${id}`, position, average })
const ids = (time) => time.players.map((p) => p.id).sort((a, b) => a - b)
const sempreOPrimeiro = () => 0.999 // só substitui quando for a 1ª divisão ótima (probabilidade 1/1)
const sempreOUltimo = () => 0

describe('forcaDoJogador', () => {
  it('usa a média; sem média entra com 3,0', () => {
    expect(forcaDoJogador({ average: 4.2 })).toBe(4.2)
    expect(forcaDoJogador({ average: null })).toBe(FORCA_PADRAO)
    expect(FORCA_PADRAO).toBe(3)
  })
})

describe('lerIdsDoSorteio', () => {
  it('aceita uma lista de ids de 6 a 22 jogadores', () => {
    expect(lerIdsDoSorteio({ playerIds: [1, 2, 3, 4, 5, 6] })).toEqual([1, 2, 3, 4, 5, 6])
    expect(MIN_JOGADORES).toBe(6)
    expect(MAX_JOGADORES).toBe(22)
  })

  it.each([
    [{}, 'lista de ids'],
    [{ playerIds: 'x' }, 'lista de ids'],
    [{ playerIds: [1, 2, 3, 4, 5, 'a'] }, 'lista de ids'],
    [{ playerIds: [1, 2, 3, 4, 5, 0] }, 'lista de ids'],
    [{ playerIds: [1, 2, 3, 4, 5] }, 'pelo menos 6'],
    [{ playerIds: Array.from({ length: 23 }, (_, i) => i + 1) }, 'no máximo 22'],
    [{ playerIds: [1, 2, 3, 4, 5, 5] }, 'repetido'],
  ])('rejeita %j', (corpo, mensagem) => {
    expect(() => lerIdsDoSorteio(corpo)).toThrow(mensagem)
  })
})

describe('sortearTimes: tamanhos', () => {
  it('quantidade par: dois times do mesmo tamanho', () => {
    const r = sortearTimes({ jogadores: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => j(id, 3)), aleatorio: sempreOPrimeiro })
    expect(r.teamA.players).toHaveLength(4)
    expect(r.teamB.players).toHaveLength(4)
  })

  it('quantidade ímpar: um time com 1 jogador a mais', () => {
    const r = sortearTimes({ jogadores: [1, 2, 3, 4, 5, 6, 7].map((id) => j(id, 3)), aleatorio: sempreOPrimeiro })
    expect([r.teamA.players.length, r.teamB.players.length].sort()).toEqual([3, 4])
  })

  it('todos os jogadores são usados, cada um uma única vez', () => {
    const jogadores = [1, 2, 3, 4, 5, 6, 7].map((id) => j(id, id % 5 || 1))
    const r = sortearTimes({ jogadores, aleatorio: sempreOUltimo })
    expect([...ids(r.teamA), ...ids(r.teamB)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('sortearTimes: equilíbrio', () => {
  it('acha a divisão de menor diferença (os dois craques não ficam juntos)', () => {
    // 5, 5, 3, 3, 1, 1: o ótimo dá 9 para cada lado ({5,3,1} x {5,3,1}).
    const jogadores = [j(1, 5), j(2, 5), j(3, 3), j(4, 3), j(5, 1), j(6, 1)]
    const r = sortearTimes({ jogadores, aleatorio: sempreOUltimo })
    expect(r.difference).toBe(0)
    expect(ids(r.teamA).includes(1)).not.toBe(ids(r.teamA).includes(2)) // um em cada time
  })

  it('devolve a força média de cada time e a diferença', () => {
    const jogadores = [j(1, 5), j(2, 4), j(3, 3), j(4, 3), j(5, 2), j(6, 1)] // soma 18: ótimo 9 x 9
    const r = sortearTimes({ jogadores, aleatorio: sempreOPrimeiro })
    expect(r.teamA.strength).toBe(3)
    expect(r.teamB.strength).toBe(3)
    expect(r.difference).toBe(0)
  })

  it('jogador sem média entra com 3,0 no cálculo', () => {
    // Sem média = 3: força {5, 3, 3} = 3,67 x {3, 3, 1}... o ótimo ainda é achado com os valores padrão.
    const jogadores = [j(1, 5), j(2, null), j(3, null), j(4, null), j(5, 1), j(6, 3)]
    const r = sortearTimes({ jogadores, aleatorio: sempreOUltimo })
    const todas = [...r.teamA.players, ...r.teamB.players]
    expect(todas.find((p) => p.id === 2).strength).toBe(3)
    expect(r.difference).toBeCloseTo(0, 9) // 5+1+3 = 9 x 3+3+3 = 9
  })

  it('com quantidade ímpar compara médias (e não somas)', () => {
    // 7 jogadores de força 3: qualquer divisão tem diferença 0 de média.
    const r = sortearTimes({ jogadores: [1, 2, 3, 4, 5, 6, 7].map((id) => j(id, 3)), aleatorio: sempreOPrimeiro })
    expect(r.difference).toBe(0)
  })
})

describe('sortearTimes: goleiros', () => {
  it('com 2 goleiros, um em cada time (mesmo que juntos equilibrassem melhor)', () => {
    // Sem a regra o melhor seria {4,4,1} x {3,3,3} (diferença 0), com os goleiros juntos.
    const jogadores = [j(1, 4, 'GOALKEEPER'), j(2, 4, 'GOALKEEPER'), j(3, 1), j(4, 3), j(5, 3), j(6, 3)]
    const r = sortearTimes({ jogadores, aleatorio: sempreOUltimo })
    const goleiros = (time) => time.players.filter((p) => p.position === 'GOALKEEPER').length
    expect([goleiros(r.teamA), goleiros(r.teamB)]).toEqual([1, 1])
  })

  it('com 1 goleiro só, a posição não restringe nada', () => {
    const jogadores = [j(1, 5, 'GOALKEEPER'), j(2, 5), j(3, 3), j(4, 3), j(5, 1), j(6, 1)]
    expect(sortearTimes({ jogadores, aleatorio: sempreOUltimo }).difference).toBe(0)
  })

  it('com 3 goleiros "1 por time" é impossível: divide o mais igual possível (2 x 1)', () => {
    // Só a divisão 3 x 0 daria diferença 0 ({3,3,3} x {2,2,5}); a regra a impede.
    const jogadores = [
      j(1, 3, 'GOALKEEPER'), j(2, 3, 'GOALKEEPER'), j(3, 3, 'GOALKEEPER'), j(4, 2), j(5, 2), j(6, 5),
    ]
    const r = sortearTimes({ jogadores, aleatorio: sempreOUltimo })
    const goleiros = (time) => time.players.filter((p) => p.position === 'GOALKEEPER').length
    expect([goleiros(r.teamA), goleiros(r.teamB)].sort()).toEqual([1, 2])
    expect(r.difference).toBeGreaterThan(0)
  })
})

describe('sortearTimes: sorteio entre divisões igualmente boas', () => {
  const todosIguais = [1, 2, 3, 4, 5, 6].map((id) => j(id, 3))

  it('o sorteador escolhe qual das divisões ótimas sai (resultados diferentes)', () => {
    const a = sortearTimes({ jogadores: todosIguais, aleatorio: sempreOPrimeiro })
    const b = sortearTimes({ jogadores: todosIguais, aleatorio: sempreOUltimo })
    expect(ids(a.teamA)).not.toEqual(ids(b.teamA))
  })

  it('mesmo sorteador, mesma entrada: mesmo resultado (determinístico)', () => {
    const a = sortearTimes({ jogadores: todosIguais, aleatorio: sempreOUltimo })
    const b = sortearTimes({ jogadores: todosIguais, aleatorio: sempreOUltimo })
    expect(ids(a.teamA)).toEqual(ids(b.teamA))
  })

  it('o resultado não depende da ordem em que os jogadores chegam', () => {
    const invertida = [...todosIguais].reverse()
    const a = sortearTimes({ jogadores: todosIguais, aleatorio: sempreOUltimo })
    const b = sortearTimes({ jogadores: invertida, aleatorio: sempreOUltimo })
    expect(ids(a.teamA)).toEqual(ids(b.teamA))
  })

  it('com 22 jogadores responde rápido (força bruta cabe no limite)', () => {
    const muitos = Array.from({ length: 22 }, (_, i) => j(i + 1, ((i * 7) % 5) + 1))
    const inicio = Date.now()
    const r = sortearTimes({ jogadores: muitos, aleatorio: sempreOUltimo })
    expect(Date.now() - inicio).toBeLessThan(3000)
    expect(r.teamA.players).toHaveLength(11)
  })
})
