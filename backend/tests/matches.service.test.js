import { describe, expect, it } from 'vitest'
import { criarMatchesService } from '../src/features/matches/matches.service.js'

// Repositórios falsos e mínimos: guardam o que o serviço pediu para gravar.
function cenario({ partida = { id: 1, status: 'SCHEDULED', players: [] } } = {}) {
  const gravado = {}
  const matchesRepo = {
    buscarPorId: async (id) => (id === partida.id ? partida : null),
    substituirEscalacao: async (id, escalacao) => (gravado.escalacao = escalacao),
    mudarStatus: async (id, mudanca) => (gravado.status = mudanca),
    criarGol: async (dados) => (gravado.gol = dados),
    removerGol: async (goalId) => (gravado.golRemovido = goalId),
  }
  const playersRepo = {
    buscarPorIds: async (ids) => ids.map((id) => ({ id, nickname: `J${id}`, active: true })),
  }
  return { service: criarMatchesService({ matchesRepo, playersRepo }), gravado }
}

describe('matchesService', () => {
  it('partida que não existe -> NotFoundError', async () => {
    const { service } = cenario()
    await expect(service.buscar(42)).rejects.toThrow('Partida não encontrada')
  })

  it('definirEscalacao grava os dois times validados', async () => {
    const { service, gravado } = cenario()

    await service.definirEscalacao(1, { teamA: [1, 2], teamB: [3] })

    expect(gravado.escalacao).toEqual([
      { playerId: 1, team: 'A' },
      { playerId: 2, team: 'A' },
      { playerId: 3, team: 'B' },
    ])
  })

  it('definirEscalacao não grava nada se a partida já começou', async () => {
    const { service, gravado } = cenario({ partida: { id: 1, status: 'IN_PROGRESS', players: [] } })

    await expect(service.definirEscalacao(1, { teamA: [1], teamB: [2] })).rejects.toThrow('agendada')
    expect(gravado.escalacao).toBeUndefined()
  })

  it('iniciar pede a troca de SCHEDULED para IN_PROGRESS', async () => {
    const players = [1, 2, 3, 4, 5, 6].map((playerId) => ({ playerId, team: playerId <= 3 ? 'A' : 'B' }))
    const { service, gravado } = cenario({ partida: { id: 1, status: 'SCHEDULED', players } })

    await service.iniciar(1)

    expect(gravado.status).toEqual({ de: 'SCHEDULED', para: 'IN_PROGRESS' })
  })

  it('registrarGol grava o gol com a partida e o time calculado', async () => {
    const players = [{ playerId: 1, team: 'A' }, { playerId: 4, team: 'B' }]
    const { service, gravado } = cenario({ partida: { id: 1, status: 'IN_PROGRESS', players, goals: [] } })

    await service.registrarGol(1, { scorerId: 1, ownGoal: true })

    expect(gravado.gol).toEqual({ matchId: 1, scorerId: 1, assistId: null, minute: null, ownGoal: true, team: 'B' })
  })

  it('removerGol: gol de outra partida -> NotFoundError e nada é apagado', async () => {
    const { service, gravado } = cenario({ partida: { id: 1, status: 'IN_PROGRESS', players: [], goals: [{ id: 5 }] } })

    await expect(service.removerGol(1, 6)).rejects.toThrow('Gol não encontrado')
    expect(gravado.golRemovido).toBeUndefined()
  })

  it('removerGol não apaga gol de partida encerrada', async () => {
    const { service, gravado } = cenario({ partida: { id: 1, status: 'FINISHED', players: [], goals: [{ id: 5 }] } })

    await expect(service.removerGol(1, 5)).rejects.toThrow('em andamento')
    expect(gravado.golRemovido).toBeUndefined()
  })
})
