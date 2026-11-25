import { describe, expect, it } from 'vitest'
import { artilheirosPorTime, escolherCobra, montarPodio } from './resumo.js'

const gol = (team, id, nickname, ownGoal = false) => ({ team, ownGoal, scorer: { id, nickname } })

describe('artilheirosPorTime', () => {
  it('agrupa os gols por time e por jogador, do maior para o menor', () => {
    const gols = [gol('A', 1, 'Zé'), gol('B', 2, 'Tico'), gol('A', 3, 'Bia'), gol('A', 3, 'Bia')]

    expect(artilheirosPorTime(gols)).toEqual({
      A: [
        { id: 3, nome: 'Bia', gols: 2 },
        { id: 1, nome: 'Zé', gols: 1 },
      ],
      B: [{ id: 2, nome: 'Tico', gols: 1 }],
    })
  })

  it('ignora gol contra e aceita lista vazia ou ausente', () => {
    expect(artilheirosPorTime([gol('A', 1, 'Zé', true)])).toEqual({ A: [], B: [] })
    expect(artilheirosPorTime(undefined)).toEqual({ A: [], B: [] })
  })
})

describe('montarPodio', () => {
  it('usa o ranking geral (pontos) e pega só o top 3', () => {
    const geral = [1, 2, 3, 4].map((i) => ({ playerId: i, nickname: `J${i}`, points: 10 - i }))

    const podio = montarPodio({ geral, artilharia: [] })

    expect(podio.criterio).toBe('pontos')
    expect(podio.linhas.map((l) => l.nome)).toEqual(['J1', 'J2', 'J3'])
    expect(podio.linhas[0].valor).toBe(9)
  })

  it('sem ninguém com o mínimo de jogos, cai para a artilharia', () => {
    const podio = montarPodio({ geral: [], artilharia: [{ playerId: 7, name: 'Ana', nickname: null, goals: 4 }] })
    expect(podio).toEqual({ criterio: 'gols', linhas: [{ id: 7, nome: 'Ana', valor: 4 }] })
  })

  it('sem dados devolve pódio vazio (inclusive se a API respondeu algo inesperado)', () => {
    expect(montarPodio(null).linhas).toEqual([])
    expect(montarPodio([]).linhas).toEqual([])
  })
})

describe('escolherCobra', () => {
  it('prefere o craque votado na última partida; empate junta os nomes', () => {
    const um = { craques: [{ playerId: 2, nickname: 'Tico', votes: 4 }] }
    expect(escolherCobra(um, null)).toEqual({ tipo: 'craque', id: 2, nome: 'Tico', votos: 4, empate: false })
    const dois = { craques: [{ playerId: 2, nickname: 'Tico', votes: 3 }, { playerId: 5, nickname: 'Bia', votes: 3 }] }
    expect(escolherCobra(dois, null)).toMatchObject({ nome: 'Tico e Bia', votos: 3, empate: true })
  })

  it('sem votos usa o artilheiro geral; sem nada, null', () => {
    expect(escolherCobra({ craques: [] }, { artilharia: [{ playerId: 3, nickname: 'Bia', goals: 9 }] })).toMatchObject({ tipo: 'artilheiro' })
    const ranking = { artilharia: [{ playerId: 3, nickname: 'Bia', goals: 9 }] }
    expect(escolherCobra(null, ranking)).toEqual({ tipo: 'artilheiro', id: 3, nome: 'Bia', gols: 9 })
    expect(escolherCobra(null, null)).toBeNull()
  })
})
