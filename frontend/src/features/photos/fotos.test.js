import { describe, expect, it } from 'vitest'
import { iniciais, mapaDeVersoes, recorteQuadrado } from './fotos.js'

describe('iniciais', () => {
  it('uma palavra: as duas primeiras letras, em maiúsculas', () => {
    expect(iniciais('Zé')).toBe('ZÉ')
    expect(iniciais('beto')).toBe('BE')
  })

  it('várias palavras: primeira letra da primeira e da última', () => {
    expect(iniciais('José da Silva')).toBe('JS')
    expect(iniciais('  Ana   Maria  ')).toBe('AM')
  })

  it('sem nome: "?"', () => {
    expect(iniciais('')).toBe('?')
    expect(iniciais(undefined)).toBe('?')
  })
})

describe('recorteQuadrado', () => {
  it('foto em pé: corta em cima e embaixo, no centro', () => {
    expect(recorteQuadrado(300, 500)).toEqual({ x: 0, y: 100, lado: 300 })
  })

  it('foto deitada: corta dos lados', () => {
    expect(recorteQuadrado(400, 200)).toEqual({ x: 100, y: 0, lado: 200 })
  })

  it('já quadrada: não corta nada', () => {
    expect(recorteQuadrado(256, 256)).toEqual({ x: 0, y: 0, lado: 256 })
  })
})

describe('mapaDeVersoes', () => {
  it('transforma a lista da API em playerId -> versão', () => {
    const mapa = mapaDeVersoes([{ playerId: 2, version: 10 }, { playerId: 5, version: 20 }])
    expect(mapa.get(2)).toBe(10)
    expect(mapa.get(5)).toBe(20)
    expect(mapa.has(1)).toBe(false)
    expect(mapaDeVersoes(undefined).size).toBe(0)
  })
})
