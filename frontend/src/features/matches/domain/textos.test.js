import { describe, expect, it } from 'vitest'
import { dataJaPassou, precisaDeResultado } from './textos.js'

const agora = new Date('2026-11-27T12:00:00Z')

describe('data no passado', () => {
  it('dataJaPassou: antes de agora é passado; vazio não', () => {
    expect(dataJaPassou('2026-11-20T22:00:00Z', agora)).toBe(true)
    expect(dataJaPassou('2026-11-28T22:00:00Z', agora)).toBe(false)
    expect(dataJaPassou('', agora)).toBe(false)
  })

  it('precisaDeResultado: só a AGENDADA com data que já passou', () => {
    const ontem = '2026-11-26T22:00:00Z'
    expect(precisaDeResultado({ status: 'SCHEDULED', date: ontem }, agora)).toBe(true)
    expect(precisaDeResultado({ status: 'SCHEDULED', date: '2026-12-01T22:00:00Z' }, agora)).toBe(false)
    expect(precisaDeResultado({ status: 'FINISHED', date: ontem }, agora)).toBe(false)
    expect(precisaDeResultado({ status: 'CANCELED', date: ontem }, agora)).toBe(false)
  })
})
