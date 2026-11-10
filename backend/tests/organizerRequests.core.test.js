import { describe, expect, it } from 'vitest'
import {
  validarMotivo,
  verificarDecisao,
  verificarElegibilidade,
} from '../src/features/organizerRequests/organizerRequests.core.js'

const agora = new Date('2026-11-10T12:00:00Z')
const jogador = { id: 1, role: 'PLAYER', playerId: 5 }

describe('validarMotivo', () => {
  it('aceita de 10 a 200 caracteres e tira espaços das pontas', () => {
    expect(validarMotivo('  Organizo a pelada de quinta  ')).toBe('Organizo a pelada de quinta')
  })
  it.each([['curto'], ['x'.repeat(201)], [undefined], [123]])('rejeita %s', (valor) => {
    expect(() => validarMotivo(valor)).toThrow('10 a 200')
  })
})

describe('verificarElegibilidade', () => {
  it('jogador vinculado, sem pedido anterior, pode pedir', () => {
    expect(() => verificarElegibilidade({ usuario: jogador, ultimoPedido: null, agora })).not.toThrow()
  })

  it('quem já é organizador não pede', () => {
    expect(() =>
      verificarElegibilidade({ usuario: { ...jogador, role: 'ORGANIZER' }, ultimoPedido: null, agora }),
    ).toThrow('já é organizador')
  })

  it('conta sem jogador vinculado não pede', () => {
    expect(() =>
      verificarElegibilidade({ usuario: { ...jogador, playerId: null }, ultimoPedido: null, agora }),
    ).toThrow('vincular sua conta')
  })

  it('não pede de novo enquanto há pedido em análise', () => {
    expect(() =>
      verificarElegibilidade({ usuario: jogador, ultimoPedido: { status: 'PENDING' }, agora }),
    ).toThrow('em análise')
  })

  it('depois de recusado, só pede de novo após 7 dias', () => {
    const recusadoHa = (dias) => ({
      status: 'REJECTED',
      decidedAt: new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000),
    })
    expect(() =>
      verificarElegibilidade({ usuario: jogador, ultimoPedido: recusadoHa(6), agora }),
    ).toThrow(/novamente em \d{2}\/\d{2}\/\d{4}/)
    expect(() =>
      verificarElegibilidade({ usuario: jogador, ultimoPedido: recusadoHa(7), agora }),
    ).not.toThrow()
  })

  it('pedido já aprovado no passado não bloqueia (ex.: foi rebaixado depois)', () => {
    expect(() =>
      verificarElegibilidade({ usuario: jogador, ultimoPedido: { status: 'APPROVED' }, agora }),
    ).not.toThrow()
  })
})

describe('verificarDecisao', () => {
  it('pedido em análise de outra pessoa pode ser decidido', () => {
    expect(() =>
      verificarDecisao({ pedido: { status: 'PENDING', userId: 1 }, decisorId: 2 }),
    ).not.toThrow()
  })
  it('pedido já decidido não pode ser decidido de novo', () => {
    expect(() =>
      verificarDecisao({ pedido: { status: 'APPROVED', userId: 1 }, decisorId: 2 }),
    ).toThrow('já foi decidido')
  })
  it('ninguém decide o próprio pedido', () => {
    expect(() =>
      verificarDecisao({ pedido: { status: 'PENDING', userId: 2 }, decisorId: 2 }),
    ).toThrow('próprio pedido')
  })
})
