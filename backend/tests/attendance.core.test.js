// Núcleo puro da lista de presença: confirmados x espera sai da ordem de chegada e das vagas.
import { describe, expect, it } from 'vitest'
import {
  jogadorDaPresenca,
  montarLista,
  verificarListaAberta,
  verificarPodeMexer,
} from '../src/features/attendance/core/attendance.core.js'

const presenca = (playerId, minuto) => ({
  playerId,
  createdAt: new Date(Date.UTC(2026, 10, 1, 12, minuto)),
  player: { nickname: `J${playerId}`, position: 'MIDFIELDER' },
})

describe('montarLista', () => {
  it('os primeiros a chegar ocupam as vagas; o resto vai para a espera, na ordem', () => {
    const lista = montarLista({ presencas: [presenca(3, 2), presenca(1, 0), presenca(2, 1)], maxPlayers: 2 })
    expect(lista.confirmed.map((l) => l.playerId)).toEqual([1, 2])
    expect(lista.waitlist.map((l) => [l.playerId, l.order])).toEqual([[3, 3]])
    expect(lista.openSpots).toBe(0)
  })

  it('sem limite de vagas, todo mundo é confirmado e openSpots é null', () => {
    const lista = montarLista({ presencas: [presenca(1, 0), presenca(2, 1)], maxPlayers: null })
    expect(lista.confirmed).toHaveLength(2)
    expect(lista.waitlist).toEqual([])
    expect(lista.openSpots).toBeNull()
  })

  it('quando alguém sai, o primeiro da espera sobe sozinho', () => {
    const antes = [presenca(1, 0), presenca(2, 1), presenca(3, 2)]
    const depois = antes.filter((p) => p.playerId !== 1)
    expect(montarLista({ presencas: depois, maxPlayers: 2 }).confirmed.map((l) => l.playerId)).toEqual([2, 3])
  })

  it('diz onde EU estou: confirmado, espera ou fora da lista', () => {
    const presencas = [presenca(1, 0), presenca(2, 1)]
    expect(montarLista({ presencas, maxPlayers: 1, meuJogadorId: 1 }).me).toBe('CONFIRMED')
    expect(montarLista({ presencas, maxPlayers: 1, meuJogadorId: 2 }).me).toBe('WAITLIST')
    expect(montarLista({ presencas, maxPlayers: 1, meuJogadorId: 9 }).me).toBeNull()
    expect(montarLista({ presencas, maxPlayers: 5 }).openSpots).toBe(3)
  })

  it('mesmo instante desempata pelo id do jogador (lista estável)', () => {
    const lista = montarLista({ presencas: [presenca(5, 0), presenca(4, 0)], maxPlayers: 1 })
    expect(lista.confirmed[0].playerId).toBe(4)
  })
})

describe('regras de quem mexe na lista', () => {
  const membro = { role: 'MEMBER', playerId: 1 }

  it('a lista só muda com a partida agendada', () => {
    expect(() => verificarListaAberta({ status: 'SCHEDULED' })).not.toThrow()
    for (const status of ['IN_PROGRESS', 'FINISHED', 'CANCELED']) {
      expect(() => verificarListaAberta({ status })).toThrow('agendada')
    }
  })

  it('sem playerId no corpo, entra o jogador de quem pede; sem jogador ligado, erro claro', () => {
    expect(jogadorDaPresenca(membro, {})).toBe(1)
    expect(jogadorDaPresenca(membro, { playerId: 4 })).toBe(4)
    expect(() => jogadorDaPresenca({ role: 'MEMBER', playerId: null }, {})).toThrow('ligada a um jogador')
  })

  it('membro só mexe no próprio nome; organizador mexe em qualquer um', () => {
    expect(() => verificarPodeMexer({ participacao: membro, playerId: 1 })).not.toThrow()
    expect(() => verificarPodeMexer({ participacao: membro, playerId: 2 })).toThrow('próprio nome')
    expect(() => verificarPodeMexer({ participacao: { role: 'ORGANIZER', playerId: null }, playerId: 2 })).not.toThrow()
  })
})
