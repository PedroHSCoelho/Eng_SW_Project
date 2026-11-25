// Regras puras da foto: tipo pelos bytes, tamanho e quem pode trocar.
import { describe, expect, it } from 'vitest'
import { podeMexerNaFoto, tipoDaImagem, validarFoto, TAMANHO_MAXIMO_DA_FOTO } from '../src/features/photos/photos.core.js'

// Começos reais de cada formato, completados com zeros até ter tamanho suficiente.
const comecoDe = (...bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(20)])
const JPEG = comecoDe(0xff, 0xd8, 0xff, 0xe0)
const PNG = comecoDe(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(10)])

describe('tipoDaImagem', () => {
  it('reconhece JPEG, PNG e WebP pela assinatura', () => {
    expect(tipoDaImagem(JPEG)).toBe('image/jpeg')
    expect(tipoDaImagem(PNG)).toBe('image/png')
    expect(tipoDaImagem(WEBP)).toBe('image/webp')
  })

  it('não aceita outra coisa (texto, GIF, SVG) nem arquivo curto demais', () => {
    expect(tipoDaImagem(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(tipoDaImagem(Buffer.from('GIF89a......'))).toBeNull()
    expect(tipoDaImagem(Buffer.from([0xff, 0xd8]))).toBeNull()
    expect(tipoDaImagem(undefined)).toBeNull()
  })
})

describe('validarFoto', () => {
  it('devolve o tipo descoberto e os bytes', () => {
    expect(validarFoto(PNG)).toEqual({ mimeType: 'image/png', data: PNG })
  })

  it('corpo vazio ou que não é Buffer -> erro 400', () => {
    for (const corpo of [undefined, {}, Buffer.alloc(0), 'texto']) {
      expect(() => validarFoto(corpo)).toThrow(expect.objectContaining({ status: 400 }))
    }
  })

  it('acima de 200 KB -> erro 400, mesmo sendo JPEG', () => {
    const grande = Buffer.concat([JPEG, Buffer.alloc(TAMANHO_MAXIMO_DA_FOTO)])
    expect(() => validarFoto(grande)).toThrow(/grande demais/)
  })

  it('bytes que não são imagem -> erro 400', () => {
    expect(() => validarFoto(Buffer.from('isto não é uma foto, é texto'))).toThrow(/não é uma imagem/)
  })
})

describe('podeMexerNaFoto', () => {
  it('admin mexe na foto de qualquer jogador', () => {
    expect(podeMexerNaFoto({ role: 'ORGANIZER', playerId: null }, 7)).toBe(true)
  })

  it('membro só mexe na própria foto', () => {
    expect(podeMexerNaFoto({ role: 'MEMBER', playerId: 7 }, 7)).toBe(true)
    expect(podeMexerNaFoto({ role: 'MEMBER', playerId: 7 }, 8)).toBe(false)
    expect(podeMexerNaFoto({ role: 'MEMBER', playerId: null }, 8)).toBe(false)
  })
})
