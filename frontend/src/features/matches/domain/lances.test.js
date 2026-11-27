import { describe, expect, it } from 'vitest'
import { emOrdemDaSumula, numerosDosJogadores, textoDaLista } from './lances.js'

const escalacao = [1, 2, 3].map((playerId) => ({ playerId, team: playerId < 3 ? 'A' : 'B' }))

describe('numerosDosJogadores', () => {
  it('conta gols (sem o gol contra), assistências, cartões e defesas de cada escalado', () => {
    const numeros = numerosDosJogadores({
      players: escalacao,
      goals: [
        { scorerId: 1, assistId: 2, ownGoal: false },
        { scorerId: 1, assistId: null, ownGoal: true },
      ],
      events: [
        { playerId: 3, type: 'DIFFICULT_SAVE' },
        { playerId: 2, type: 'YELLOW_CARD' },
      ],
    })
    expect(numeros[1]).toMatchObject({ gols: 1, contra: 1, assistencias: 0, expulso: false })
    expect(numeros[2]).toMatchObject({ assistencias: 1, amarelos: 1, expulso: false })
    expect(numeros[3]).toMatchObject({ defesas: 1 })
  })

  it('2 amarelos ou 1 vermelho = expulso; partida sem `events` funciona', () => {
    const amarelo = { playerId: 1, type: 'YELLOW_CARD' }
    expect(numerosDosJogadores({ players: escalacao, goals: [], events: [amarelo, amarelo] })[1].expulso).toBe(true)
    expect(numerosDosJogadores({ players: escalacao, goals: [], events: [{ playerId: 2, type: 'RED_CARD' }] })[2].expulso).toBe(true)
    expect(numerosDosJogadores({ players: escalacao, goals: [] })[1].amarelos).toBe(0)
  })
})

describe('textoDaLista', () => {
  const partida = { date: '2026-11-27T23:00:00.000Z', location: 'Quadra' }
  const linha = (playerId, nickname) => ({ playerId, nickname })

  it('numera confirmados, mostra as vagas livres e a espera, pronto para colar no WhatsApp', () => {
    const texto = textoDaLista({
      partida,
      formatarData: () => 'sex 20h',
      lista: { maxPlayers: 3, confirmed: [linha(1, 'Zé'), linha(2, 'Bia')], waitlist: [] },
    })
    expect(texto).toBe('⚽ sex 20h · Quadra\nConfirmados (2/3):\n1. Zé\n2. Bia\n3.')
  })

  it('com espera e sem limite', () => {
    const cheia = textoDaLista({
      partida,
      formatarData: () => 'sex',
      lista: { maxPlayers: 1, confirmed: [linha(1, 'Zé')], waitlist: [linha(2, 'Bia')] },
    })
    expect(cheia).toContain('Lista de espera:\n1. Bia')
    const livre = textoDaLista({ partida, formatarData: () => 'sex', lista: { maxPlayers: null, confirmed: [linha(1, 'Zé')], waitlist: [] } })
    expect(livre).toBe('⚽ sex · Quadra\nConfirmados (1):\n1. Zé')
  })

  it('convidados entram na numeração (com quem convidou) e o talvez aparece marcado na espera', () => {
    const texto = textoDaLista({
      partida,
      formatarData: () => 'sex',
      lista: {
        maxPlayers: 3,
        confirmed: [linha(1, 'Zé')],
        waitlist: [{ ...linha(2, 'Beto'), maybe: true }],
        guests: [
          { id: 1, name: 'Primo', invitedBy: { playerId: 1, nickname: 'Zé' }, status: 'CONFIRMED' },
          { id: 2, name: 'Amigo', invitedBy: null, status: 'WAITLIST' },
        ],
      },
    })
    expect(texto).toContain('Confirmados (2/3):\n1. Zé\n2. Primo (convidado do Zé)\n3.')
    expect(texto).toContain('Lista de espera:\n1. Beto (talvez)\n2. Amigo (convidado)')
  })
})

describe('emOrdemDaSumula (gols e cartões em ordem)', () => {
  it('jogo único: pelo minuto, sem minuto no fim, empate pela ordem de lançamento', () => {
    const cartoes = [{ id: 1, minute: 8 }, { id: 2, minute: 9 }, { id: 3, minute: 6 }, { id: 4, minute: null }, { id: 5, minute: 6 }]
    expect(emOrdemDaSumula(cartoes, { games: [] }).map((c) => c.id)).toEqual([3, 5, 1, 2, 4])
  })

  it('pelada: primeiro o jogo da noite, depois o minuto (não mistura os jogos)', () => {
    const partida = { games: [{ id: 10, number: 1 }, { id: 11, number: 2 }] }
    const gols = [
      { id: 1, gameId: 11, minute: 2 },
      { id: 2, gameId: 10, minute: 9 },
      { id: 3, gameId: 10, minute: 3 },
      { id: 4, gameId: 11, minute: 1 },
    ]
    expect(emOrdemDaSumula(gols, partida).map((g) => g.id)).toEqual([3, 2, 4, 1])
  })

  it('não altera a lista original', () => {
    const lista = [{ id: 2, minute: 5 }, { id: 1, minute: 1 }]
    emOrdemDaSumula(lista, {})
    expect(lista.map((x) => x.id)).toEqual([2, 1])
  })
})
