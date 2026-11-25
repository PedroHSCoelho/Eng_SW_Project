import { describe, expect, it } from 'vitest'
import { PALETA, corInicial, proximaCor } from './coresDosTimes.js'

describe('cores dos times', () => {
  it('usa a cor que está no nome do time, com ou sem acento e maiúsculas', () => {
    expect(PALETA[corInicial('Azul', 0)].nome).toBe('Azul')
    expect(PALETA[corInicial('Time LARANJA', 0)].nome).toBe('Laranja')
    expect(PALETA[corInicial('Verde', 0)].nome).toBe('Verde')
  })

  it('sem cor no nome, segue a paleta pela ordem do time', () => {
    expect(corInicial('Time A', 0)).toBe(0)
    expect(corInicial('Com camisa', 2)).toBe(2)
  })

  it('o botão passa para a próxima cor e volta ao começo', () => {
    expect(proximaCor(0)).toBe(1)
    expect(proximaCor(PALETA.length - 1)).toBe(0)
  })
})
