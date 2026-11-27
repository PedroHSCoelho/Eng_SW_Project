import { describe, expect, it } from 'vitest'
import { numerosDosJogadores, textoDaLista } from './lances.js'

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
